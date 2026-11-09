const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=(p)=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const migration=read('supabase/migrations/20261109153000_pause_external_coworking_space_registration.sql');
test('backend suspends external inserts/updates but retains admin ability',()=>{
 assert.match(migration,/drop policy if exists spaces_insert/);
 assert.match(migration,/create policy spaces_insert[\s\S]*?with check \(\(select public\.is_admin\(\)\)\)/);
 assert.match(migration,/create policy spaces_update[\s\S]*?using \(\(select public\.is_admin\(\)\)\)/);
 assert.match(migration,/mva_guard_paused_external_listings/);
 assert.match(migration,/owner_subscriptions_enabled = false/);
});
test('external partner signup is absent from all public entry points',()=>{
 const auth=read('src/components/auth/AuthModal.tsx');
 const home=read('src/components/home/HomeView.tsx');
 const marketplace=read('src/components/marketplace/MarketplaceView.tsx');
 const navbar=read('src/components/common/Navbar.tsx');
 const footer=read('src/components/common/Footer.tsx');
 assert.match(auth,/const type = 'client' as const/);
 assert.doesNotMatch(auth,/Tenho coworking/);
 for(const text of [home,marketplace,navbar,footer]){
  assert.doesNotMatch(text,/setActiveTab\('owner-dashboard'\)/);
 }
 assert.doesNotMatch(home,/id:'owner-dashboard'/);
 assert.doesNotMatch(navbar,/tab: 'owner-dashboard'/);
});
test('direct owner dashboard access stays restricted to MVA admin',()=>{
 const app=read('src/App.tsx');
 const state=read('src/context/CoworkingContext.tsx');
 assert.match(app,/activeTab === 'owner-dashboard' && !admin/);
 assert.match(state,/O cadastro de coworkings externos está temporariamente suspenso/);
});
