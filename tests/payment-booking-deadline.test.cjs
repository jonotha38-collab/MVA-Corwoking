const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const { PGlite } = require('@electric-sql/pglite');
const { pgcrypto } = require('@electric-sql/pglite/contrib/pgcrypto');

const sql = name => readFileSync(join(__dirname, '../supabase/migrations', name), 'utf8');

test('room booking deadlines release unpaid slots only after the Stripe session is safely closed', async () => {
  const db = new PGlite({ extensions: { pgcrypto } });
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create schema extensions;
      create extension pgcrypto with schema extensions;
      create schema cron;
      create function cron.schedule(text,text,text) returns bigint language sql as $$ select 1::bigint $$;
      create schema net;
      create function net.http_post(url text, body jsonb, headers jsonb, timeout_milliseconds integer)
        returns bigint language sql as $$ select 1::bigint $$;
      create table public.bookings (
        id uuid primary key default gen_random_uuid(), user_id uuid not null default gen_random_uuid(),
        booking_date date not null, start_time time not null, status text not null default 'confirmada',
        check_in boolean not null default false, total_price numeric not null default 90,
        duration_hours numeric not null default 1, admin_complimentary boolean not null default false,
        fiscal_bonus_hours numeric not null default 0, addons text[] not null default '{}'
      );
      create table public.mva_checkout_orders (
        id uuid primary key default gen_random_uuid(), kind text not null default 'booking',
        resource_id uuid not null, user_id uuid, status text not null default 'pending',
        stripe_checkout_session_id text, stripe_account_id text, stripe_checkout_url text,
        livemode boolean not null default true, checkout_lock_until timestamptz,
        session_expires_at timestamptz, updated_at timestamptz default now()
      );
      create table public.mva_booking_redemptions (booking_id uuid, status text);
    `);
    const tomorrow = "((now() at time zone 'America/Maceio')::date + 1)";
    const insert = async (columns = '', values = '') => (await db.query(
      `insert into public.bookings (booking_date,start_time${columns})
       values (${tomorrow},'12:00'${values}) returning *`
    )).rows[0];
    const legacy = await insert();
    await db.exec(sql('20261103142500_booking_payment_cancellation_safety.sql'));
    await db.exec(sql('20261112122058_expire_unpaid_room_bookings.sql'));

    const ordinary = await insert(',payment_due_at', ",'2200-01-01'");
    const measuredDeadline = Date.parse(ordinary.payment_due_at);
    assert.ok(measuredDeadline > Date.now() + 59 * 60_000 && measuredDeadline <= Date.now() + 60 * 60_000);
    assert.equal((await insert(',admin_complimentary,total_price', ',true,0')).payment_due_at, null);
    assert.equal((await insert(',fiscal_bonus_hours,total_price', ',1,0')).payment_due_at, null);
    const near = (await db.query(`
      insert into public.bookings (booking_date, start_time)
      select starts::date, starts::time from (select (now() at time zone 'America/Maceio') + interval '15 minutes' starts) s
      returning payment_due_at
    `)).rows[0];
    assert.ok(Date.parse(near.payment_due_at) > Date.now() + 14 * 60_000);
    assert.ok(Date.parse(near.payment_due_at) <= Date.now() + 15 * 60_000);

    const [unpaid, paid, processing, credited, checked, locked, racePaid] =
      await Promise.all(Array.from({length: 7}, () => insert()));
    await db.query("insert into public.mva_booking_redemptions values ($1,'applied')", [credited.id]);
    await db.query('update public.bookings set check_in = true where id = $1', [checked.id]);
    await db.query("update public.bookings set payment_due_at = now() - interval '1 minute' where id = any($1::uuid[])",
      [[unpaid.id, paid.id, processing.id, credited.id, checked.id, locked.id, racePaid.id]]);
    const order = async (booking, session, status, lockedUntil) => (await db.query(`
      insert into public.mva_checkout_orders
        (resource_id,user_id,stripe_checkout_session_id,status,checkout_lock_until,session_expires_at)
      values ($1,$2,$3,$4,$5,now() + interval '10 minutes') returning id
    `, [booking.id, booking.user_id, session, status, lockedUntil])).rows[0].id;
    await order(paid, 'cs_paid', 'paid', null);
    await order(processing, 'cs_processing', 'pending', null);
    const racedOrder = await order(racePaid, 'cs_race', 'pending', null);
    await order(locked, null, 'pending', new Date(Date.now() + 90_000));
    const key = (await db.query('select worker_key from mva_booking_expiry_private.config')).rows[0].worker_key;
    const rpc = async (name, params) => (await db.query(
      `select public.${name}(${params.map((_,i) => '$' + (i+1)).join(',')}) as value`, params
    )).rows[0].value;
    await assert.rejects(rpc('mva_booking_expiry_candidates', ['bad-key']), { code: '42501' });
    const candidates = await rpc('mva_booking_expiry_candidates', [key]);
    assert.deepEqual(new Set(candidates.map(x => x.booking_id)), new Set([unpaid.id, processing.id, racePaid.id]));
    const expire = (booking, session = null) => rpc('mva_cancel_expired_booking', [booking.id, session]);
    assert.equal(await expire(legacy), false);
    assert.equal(await expire(ordinary), false);
    assert.equal(await expire(paid, 'cs_paid'), false);
    assert.equal(await expire(credited), false);
    assert.equal(await expire(checked), false);
    assert.equal(await expire(locked), false);
    assert.equal(await expire(processing, 'cs_wrong'), false);
    await db.query("update public.mva_checkout_orders set status='paid' where id=$1", [racedOrder]);
    assert.equal(await expire(racePaid, 'cs_race'), false);
    await assert.rejects(db.query("insert into public.mva_booking_redemptions values ($1,'applied')", [unpaid.id]), { code: '23514' });
    assert.equal(await expire(unpaid), true);
    assert.equal(await expire(unpaid), false);
    assert.equal(await expire(processing, 'cs_processing'), true);
    const updated = (await db.query("select status,payment_expired_at from public.bookings where id=$1", [processing.id])).rows[0];
    assert.equal(updated.status, 'cancelada');
    assert.ok(updated.payment_expired_at);
    assert.equal((await db.query("select status from public.mva_checkout_orders where resource_id=$1", [processing.id])).rows[0].status, 'expired');
    const lateOrder = await order(unpaid, null, 'pending', null);
    assert.equal(await rpc('mva_claim_checkout_order', [lateOrder]), false);
  } finally {
    await db.close();
  }
});
