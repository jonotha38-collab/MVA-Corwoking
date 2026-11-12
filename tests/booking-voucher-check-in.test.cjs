const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const { PGlite } = require('@electric-sql/pglite');
const { pgcrypto } = require('@electric-sql/pglite/contrib/pgcrypto');

const migration = readFileSync(join(__dirname, '../supabase/migrations/20261112115753_booking_voucher_check_in.sql'), 'utf8');
const customer = '10000000-0000-4000-8000-000000000001';
const admin = '10000000-0000-4000-8000-000000000002';
const stranger = '10000000-0000-4000-8000-000000000003';
const bookingId = number => `20000000-0000-4000-8000-${String(number).padStart(12, '0')}`;

test('voucher code and check-in use booking ownership, settlement, local date and one-time registration', async () => {
  const db = new PGlite({ extensions: { pgcrypto } });
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create schema extensions;
      create extension pgcrypto with schema extensions;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      create table public.profiles (id uuid primary key, is_admin boolean not null);
      create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
        select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false)
      $$;
      create table public.bookings (
        id uuid primary key, user_id uuid not null, space_name text not null, responsible_name text not null,
        booking_date date not null, start_time time not null default '00:00', end_time time not null default '24:00',
        duration_hours numeric not null default 1, total_price numeric not null default 75, addons text[] default '{}',
        fiscal_bonus_hours numeric not null default 0, admin_complimentary boolean not null default false,
        status text not null default 'confirmada', check_in boolean not null default false
      );
      create table public.mva_checkout_orders (
        kind text, resource_id uuid, user_id uuid, status text, livemode boolean
      );
      create table public.mva_booking_redemptions (booking_id uuid, user_id uuid, status text);
      insert into public.profiles values ('${customer}', false), ('${admin}', true), ('${stranger}', false);
    `);
    await db.exec(migration);

    const today = "(clock_timestamp() at time zone 'America/Maceio')::date";
    const fixtures = [
      { day: today },
      { day: today }, // test-mode payment
      { day: today, status: 'cancelada' },
      { day: today + ' - 1' },
      { day: today + ' + 1' },
      { day: today, price: 0, comp: true, owner: admin },
      { day: today, price: 0, bonus: 1 },
      { day: today }, // plan credit
      { day: today }, // refunded after issue
      { day: today }, // legacy code
    ];
    for (const [index, f] of fixtures.entries()) {
      await db.query(`
        insert into public.bookings (id,user_id,booking_date,space_name,responsible_name,status,total_price,admin_complimentary,fiscal_bonus_hours)
        values ($1,$2,${f.day},'Sala 1','Cliente de teste',$3,$4,$5,$6)
      `, [bookingId(index + 1), f.owner ?? customer, f.status ?? 'confirmada', f.price ?? 75, f.comp ?? false, f.bonus ?? 0]);
    }
    for (const number of [1, 2, 3, 4, 5, 9, 10]) {
      await db.query("insert into public.mva_checkout_orders values ('booking', $1, $2, 'paid', $3)", [bookingId(number), customer, number !== 2]);
    }
    await db.query("insert into public.mva_booking_redemptions values ($1, $2, 'applied')", [bookingId(8), customer]);

    const asUser = (uid, role = 'authenticated') =>
      db.exec(`reset role; set "request.jwt.claim.sub" = '${uid}'; set role ${role};`);
    const rpc = async (name, arg) => (await db.query(`select public.${name}($1) as value`, [arg])).rows[0].value;
    const issue = number => rpc('mva_booking_voucher', bookingId(number));
    const validate = code => rpc('mva_check_in_voucher', code);

    await asUser(customer);
    const first = await issue(1);
    assert.match(first.code, /^[1-9][0-9]{5}$/);
    assert.deepEqual(await issue(1), first);
    assert.equal(first.coverage, 'paid');
    assert.equal((await issue(2)).status, 'pending');
    assert.equal((await issue(3)).status, 'canceled');
    assert.equal((await issue(4)).status, 'expired');
    const future = await issue(5);
    assert.notEqual(future.code, first.code);
    assert.equal((await issue(7)).coverage, 'bonus');
    assert.equal((await issue(8)).coverage, 'credit');
    const refunded = await issue(9);
    await assert.rejects(validate(first.code), { code: '42501' });
    await assert.rejects(db.query('select * from mva_voucher_private.booking_codes'), { code: '42501' });

    await asUser(stranger);
    await assert.rejects(issue(1), { code: '42501' });
    await asUser('', 'anon');
    await assert.rejects(validate(first.code), { code: '42501' });

    await db.exec('reset role');
    await db.query("update public.mva_checkout_orders set status = 'refunded' where resource_id = $1", [bookingId(9)]);
    await asUser(admin);
    assert.equal((await issue(6)).coverage, 'complimentary');
    assert.equal((await validate('000000')).status, 'invalid');
    assert.equal((await validate(bookingId(2))).status, 'pending');
    assert.equal((await validate(bookingId(3))).status, 'canceled');
    assert.equal((await validate(bookingId(4))).status, 'expired');
    assert.equal((await validate(future.code)).status, 'early');
    assert.equal((await validate(refunded.code)).status, 'pending');
    const checkedIn = await validate(` ${first.code.slice(0, 3)}-${first.code.slice(3)} `);
    assert.equal(checkedIn.status, 'checked_in');
    assert.equal(checkedIn.room, 'Sala 1');
    assert.equal(checkedIn.startTime, '00:00');
    assert.equal((await validate(first.code)).status, 'used');
    assert.equal((await validate(bookingId(10).toUpperCase())).status, 'checked_in');
    await asUser(customer);
    assert.equal((await issue(1)).status, 'used');
    await db.exec('reset role');
    const checkedIds = (await db.query('select id from public.bookings where check_in order by id')).rows.map(row => row.id);
    assert.deepEqual(checkedIds, [bookingId(1), bookingId(10)]);
  } finally {
    await db.close();
  }
});
