const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sql = fs.readFileSync(path.join(__dirname, '../supabase/SQL_ESTAGIARIOS_E_VISIBILIDADE.sql'), 'utf8');
const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const stranger = '33333333-3333-4333-8333-333333333333';
const space = '44444444-4444-4444-8444-444444444444';

function isoDate(days = 10) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

test('reservas internas respeitam autorização, lotação, unicidade e ocultação de anúncios', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      grant usage on schema auth to authenticated, anon;
      
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      create table auth.users (id uuid primary key, email text not null, email_confirmed_at timestamptz);
      insert into auth.users values
        ('${alice}', 'alice@example.com', now()),
        ('${bob}', 'bob@example.com', now()),
        ('${stranger}', 'stranger@example.com', now());
      create or replace function public.is_admin() returns boolean language sql stable security definer
        set search_path = '' as $$ select false $$;
      create table public.spaces (
        id uuid primary key, owner_id uuid, name text, approval text not null default 'aprovado',
        status text not null default 'available' constraint spaces_status_check
          check (status in ('available','maintenance','occupied')),
        is_mva_headquarters boolean not null default false,
        updated_at timestamptz default now()
      );
      insert into public.spaces (id, owner_id, name) values ('${space}', '${alice}', 'Espaço A');
      alter table public.spaces enable row level security;
      grant usage on schema public to anon, authenticated;
      grant select on public.spaces to anon;
      grant select, update on public.spaces to authenticated;
    `);
    await db.exec(sql);
    await db.exec(sql); // Reexecutável.
    await db.exec(`
      insert into public.intern_allowed_emails(email,active) values
        ('alice@example.com', true), ('bob@example.com', true);
      update public.intern_rooms set capacity = 1;
    `);

    const [[r1], [r2]] = await Promise.all([
      db.query('select id from public.intern_rooms where code = $1', ['sala-1']).then(r => r.rows),
      db.query('select id from public.intern_rooms where code = $1', ['sala-2']).then(r => r.rows),
    ]);
    const day = isoDate();
    await db.exec(`set session "request.jwt.claim.sub" = '${alice}'; set role authenticated;`);
    assert.equal((await db.query('select public.is_intern_authorized() as allowed')).rows[0].allowed, true);
    const available = await db.query('select * from public.get_intern_room_availability($1)', [day]);
    assert.equal(available.rows.length, 2);
    assert.equal(Number(available.rows[0].places_taken), 0);
    await db.query('insert into public.intern_room_reservations (user_id, room_id, reservation_date) values ($1, $2, $3)', [alice, r1.id, day]);
    assert.equal(Number((await db.query('select places_taken from public.get_intern_room_availability($1) where room_code=$2', [day, 'sala-1'])).rows[0].places_taken), 1);
    await assert.rejects(() => db.query('insert into public.intern_room_reservations (user_id, room_id, reservation_date) values ($1,$2,$3)', [alice, r2.id, day]), /duplicate key/i);
    await assert.rejects(() => db.query('update public.spaces set name = $1 where id = $2', ['Editado sem revisão', space]), /reenvie-o para aprovação/i);
    await db.query('update public.spaces set status=$1 where id=$2', ['hidden', space]);
    await db.exec('reset role;');
    await db.exec(`set session "request.jwt.claim.sub" = ''; set role anon;`);
    assert.equal((await db.query('select * from public.spaces where id=$1', [space])).rows.length, 0, 'anúncio oculto não aparece ao visitante');
    await db.exec('reset role;');
    await db.exec(`set session "request.jwt.claim.sub" = '${alice}'; set role authenticated;`);
    assert.equal((await db.query('select status from public.spaces where id=$1', [space])).rows[0].status, 'hidden');
    await db.query('update public.spaces set status=$1 where id=$2', ['available', space]);
    await db.query('update public.spaces set name=$1, approval=$2 where id=$3', ['Enviado para revisão', 'pendente', space]);
    await db.exec('reset role;');

    await db.exec(`set session "request.jwt.claim.sub" = '${bob}'; set role authenticated;`);
    await assert.rejects(() => db.query('insert into public.intern_room_reservations(user_id,room_id,reservation_date) values ($1,$2,$3)', [bob, r1.id, day]), /lotada/i);
    await db.query('insert into public.intern_room_reservations(user_id,room_id,reservation_date) values ($1,$2,$3)', [bob, r2.id, day]);
    const nonOwnerUpdate = await db.query('update public.spaces set status=$1 where id=$2 returning id', ['hidden', space]);
    assert.equal(nonOwnerUpdate.rows.length, 0, 'um anunciante não altera o anúncio alheio');
    await db.exec('reset role;');

    await db.exec(`set session "request.jwt.claim.sub" = '${stranger}'; set role authenticated;`);
    assert.equal((await db.query('select public.is_intern_authorized() as allowed')).rows[0].allowed, false);
    assert.equal((await db.query('select * from public.intern_rooms')).rows.length, 0);
    await assert.rejects(() => db.query('insert into public.intern_room_reservations(user_id,room_id,reservation_date) values ($1,$2,$3)', [stranger, r1.id, day]), /row-level security|permission denied|não autorizado/i);
    await assert.rejects(() => db.query('select * from public.get_intern_room_availability($1)', [day]), /não autorizado/i);
    await db.exec('reset role;');

    await db.exec(`set session "request.jwt.claim.sub" = '${alice}'; set role authenticated;`);
    await db.query('update public.intern_room_reservations set status=$1 where user_id=$2 and reservation_date=$3', ['cancelada', alice, day]);
    assert.equal(Number((await db.query('select places_taken from public.get_intern_room_availability($1) where room_code=$2', [day, 'sala-1'])).rows[0].places_taken), 0);
    await db.exec('reset role;');
    await db.exec(`set session "request.jwt.claim.sub" = '${bob}'; set role authenticated;`);
    await assert.rejects(() => db.query('insert into public.intern_room_reservations(user_id,room_id,reservation_date) values ($1,$2,$3)', [bob, r1.id, day]), /duplicate key/i);
    await db.exec('reset role;');
  } finally {
    await db.close();
  }
});
