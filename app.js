const $ = (id) => document.getElementById(id);
const categories = {
  masuk: ['Gaji', 'Jajan'],
  keluar: ['Minyak Motor', 'Minyak Kereta', 'Makan', 'Jajan', 'Shopping', 'Hutang', 'Bil']
};
const STORAGE_KEY = 'duitHarian.transactions.v1';
let transactions = [];
let deferredInstallPrompt = null;
let toastTimer;

function localDateString(date = new Date()) {
  const y = date.getFullYear(), m = String(date.getMonth()+1).padStart(2,'0'), d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function money(value) {
  return new Intl.NumberFormat('ms-MY',{style:'currency',currency:'MYR'}).format(Number(value)||0)
    .replace('MYR','RM').replace(/\s/g,' ');
}
function escapeHtml(value='') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); }
function showToast(message) {
  $('toast').textContent = message; $('toast').classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>$('toast').classList.remove('show'),2600);
}
function setType(type) {
  $('transactionType').value = type;
  document.querySelectorAll('.type-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.type===type));
  $('category').innerHTML = categories[type].map(c=>`<option value="${c}">${c}</option>`).join('');
  $('paymentFields').classList.toggle('hidden', type !== 'keluar');
  updatePaymentFields();
  updateNoteRequirement();
}
function updatePaymentFields() {
  const cash = $('payment').value === 'Tunai';
  $('accountField').classList.toggle('hidden', cash);
  $('otherAccountField').classList.toggle('hidden', cash || $('account').value !== 'Lain-lain');
}
function updateNoteRequirement() {
  const required = $('transactionType').value==='keluar' && $('category').value==='Bil';
  $('note').required = required;
  $('noteHint').textContent = required ? '(Wajib untuk Bil)' : '(Pilihan)';
  $('note').placeholder = required ? 'Contoh: Bayar WiFi rumah' : 'Tambah nota jika perlu...';
}
function filteredTransactions() {
  const period = $('periodFilter').value, now = new Date(), today = localDateString(now), month = today.slice(0,7);
  return transactions.filter(t => period==='all' || (period==='today' && t.date===today) || (period==='month' && t.date.slice(0,7)===month));
}
function render() {
  const filtered = filteredTransactions();
  const income = filtered.filter(t=>t.type==='masuk').reduce((s,t)=>s+t.amount,0);
  const expense = filtered.filter(t=>t.type==='keluar').reduce((s,t)=>s+t.amount,0);
  $('incomeTotal').textContent = money(income);
  $('expenseTotal').textContent = money(expense);
  $('balanceTotal').textContent = money(income-expense);
  const sorted = [...filtered].sort((a,b)=>b.date.localeCompare(a.date) || b.createdAt-a.createdAt);
  if (!sorted.length) {
    $('transactionList').innerHTML = '<div class="empty-state">Belum ada transaksi untuk tempoh ini.<br>Tambah rekod pertama anda di atas.</div>';
    return;
  }
  $('transactionList').innerHTML = sorted.map(t => {
    const date = new Date(`${t.date}T00:00:00`);
    const dateLabel = new Intl.DateTimeFormat('ms-MY',{day:'numeric',month:'short',year:'numeric'}).format(date);
    const details = [dateLabel, t.payment, t.account].filter(Boolean).join(' · ');
    return `<article class="transaction">
      <div class="tx-icon ${t.type}">${t.type==='masuk'?'＋':'－'}</div>
      <div class="tx-main"><div class="tx-title">${escapeHtml(t.category)}</div>
        <div class="tx-meta">${escapeHtml(details)}</div>
        ${t.note?`<div class="tx-note">${escapeHtml(t.note)}</div>`:''}
      </div>
      <div class="tx-right"><div class="tx-amount ${t.type}">${t.type==='masuk'?'+':'−'}${money(t.amount)}</div>
        <div class="tx-actions"><button type="button" data-action="edit" data-id="${t.id}">Sunting</button><button type="button" data-action="delete" data-id="${t.id}">Padam</button></div>
      </div>
    </article>`;
  }).join('');
}
function resetForm() {
  $('transactionForm').reset(); $('editId').value=''; $('formTitle').textContent='Tambah transaksi';
  $('saveBtn').textContent='Simpan transaksi'; $('cancelEdit').classList.add('hidden');
  $('date').value=localDateString(); setType('masuk'); $('formError').textContent='';
}
function beginEdit(id) {
  const t=transactions.find(x=>x.id===id); if(!t)return;
  setType(t.type); $('editId').value=t.id; $('category').value=t.category;
  $('amount').value=t.amount.toFixed(2); $('date').value=t.date;
  if(t.type==='keluar') {
    $('payment').value=t.payment||'QR';
    const known=['HLB','GX Bank','TNG eWallet','ShopeePay'];
    if(t.payment==='Tunai') $('account').value='HLB';
    else if(known.includes(t.account)) $('account').value=t.account;
    else {$('account').value='Lain-lain';$('otherAccount').value=t.account||'';}
    updatePaymentFields();
  }
  $('note').value=t.note||''; updateNoteRequirement();
  $('formTitle').textContent='Sunting transaksi'; $('saveBtn').textContent='Simpan perubahan';
  $('cancelEdit').classList.remove('hidden');
  $('formPanel').scrollIntoView({behavior:'smooth',block:'start'});
}
function deleteTransaction(id) {
  const t=transactions.find(x=>x.id===id); if(!t)return;
  if(!confirm(`Padam rekod ${t.category} (${money(t.amount)})?`))return;
  transactions=transactions.filter(x=>x.id!==id); save(); render(); showToast('Transaksi telah dipadam.');
}
$('transactionForm').addEventListener('submit', e=>{
  e.preventDefault(); $('formError').textContent='';
  const type=$('transactionType').value, category=$('category').value;
  const amount=Number($('amount').value), date=$('date').value, note=$('note').value.trim();
  if(!Number.isFinite(amount)||amount<=0){$('formError').textContent='Masukkan jumlah yang sah (lebih daripada RM0).';return;}
  if(!date){$('formError').textContent='Sila pilih tarikh transaksi.';return;}
  if(type==='keluar' && category==='Bil' && !note){$('formError').textContent='Nota wajib diisi untuk kategori Bil.';$('note').focus();return;}
  const payment=type==='keluar'?$('payment').value:'';
  let account='';
  if(type==='keluar' && payment!=='Tunai') {
    account=$('account').value==='Lain-lain'?$('otherAccount').value.trim():$('account').value;
    if(!account){$('formError').textContent='Sila masukkan nama bank atau e-dompet.';$('otherAccount').focus();return;}
  }
  const id=$('editId').value;
  const existing=transactions.find(t=>t.id===id);
  const record={id:id||`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,type,category,amount:Math.round(amount*100)/100,date,note,
    payment,account,createdAt:existing?existing.createdAt:Date.now()};
  if(existing) transactions=transactions.map(t=>t.id===id?record:t); else transactions.push(record);
  save(); render(); resetForm(); showToast(existing?'Perubahan berjaya disimpan.':'Transaksi berjaya direkodkan.');
});
document.querySelectorAll('.type-btn').forEach(btn=>btn.addEventListener('click',()=>setType(btn.dataset.type)));
$('category').addEventListener('change',updateNoteRequirement);
$('payment').addEventListener('change',updatePaymentFields);
$('account').addEventListener('change',updatePaymentFields);
$('cancelEdit').addEventListener('click',resetForm);
$('periodFilter').addEventListener('change',render);
$('transactionList').addEventListener('click',e=>{
  const btn=e.target.closest('button[data-action]'); if(!btn)return;
  btn.dataset.action==='edit'?beginEdit(btn.dataset.id):deleteTransaction(btn.dataset.id);
});
$('exportBtn').addEventListener('click',()=>{
  if(!transactions.length){showToast('Tiada transaksi untuk dieksport.');return;}
  const headers=['Tarikh','Jenis','Kategori','Jumlah (RM)','Cara Bayaran','Bank / e-Dompet','Nota'];
  const rows=transactions.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(t=>[t.date,t.type==='masuk'?'Duit Masuk':'Duit Keluar',t.category,t.amount.toFixed(2),t.payment,t.account,t.note]);
  const csv=[headers,...rows].map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`duit-harian-${localDateString()}.csv`;a.click();URL.revokeObjectURL(url);
  showToast('Fail CSV berjaya dieksport.');
});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('installMessage').textContent='PWA sedia dipasang pada peranti ini.';});
$('installBtn').addEventListener('click',async()=>{
  if(deferredInstallPrompt){deferredInstallPrompt.prompt();const choice=await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$('installMessage').textContent=choice.outcome==='accepted'?'Terima kasih kerana memasang Duit Harian.':'Pemasangan belum dibuat. Anda boleh cuba lagi kemudian.';return;}
  if(/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone){
    $('installMessage').textContent='Di Safari: tekan Share → Add to Home Screen → Add.';
  } else if(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone){
    $('installMessage').textContent='Duit Harian sudah dibuka dalam mod aplikasi.';
  } else {$('installMessage').textContent='Buka menu Chrome (⋮), kemudian pilih Install app atau Add to Home screen. Pastikan website menggunakan HTTPS.';}
});
if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')) {
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
function initialise() {
  const stored=localStorage.getItem(STORAGE_KEY);
  if(stored) {
    try { transactions=JSON.parse(stored); if(!Array.isArray(transactions))transactions=[]; }
    catch { transactions=[]; }
  } else {
    // Sample records requested for the first-run functional check.
    const today=localDateString();
    transactions=[
      {id:'sample-salary',type:'masuk',category:'Gaji',amount:650,date:today,note:'Rekod contoh',payment:'',account:'',createdAt:Date.now()-1000},
      {id:'sample-wifi',type:'keluar',category:'Bil',amount:89.90,date:today,note:'Bayar WiFi rumah',payment:'Pindahan (TF)',account:'HLB',createdAt:Date.now()}
    ];
    save();
  }
  $('date').value=localDateString(); setType('masuk'); render();
}
initialise();
