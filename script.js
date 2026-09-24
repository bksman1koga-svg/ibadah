const WORSHIPS = ['Duha','Dhuhur','Jumat','Rohin','Rokat','Rokris','Budha','Tarbiyah'];
const RELIGIONS = ['Islam','Hindu','Katolik','Kristen','Budha'];
const HAFALAN_OPTIONS = {
  Islam: ['Iftitah','Ketika ruku / sujud','Ketika i’tidal','Duduk diantara dua sujud','Tasyahud awal','Sholawat','Tasyahud akhir','Doa dzikir','Doa setelah sholat','Doa orangtua','Doa masuk kerumah','Doa keluar rumah','Doa berangkat ke sekolah','Doa naik kendaraan','Doa mulai belajar','Doa selesai belajar','Doa sebelum berwudhu','Doa sesudah berwudhu','Doa masuk masjid','Doa keluar masjid','Doa setelah adzan','Doa memakai pakaian','Doa bercermin','Doa melepas pakaian','Doa sebelum makan','Doa setelah makan','Doa berbuka puasa','Doa akan tidur','Doa bangun tidur','Doa masuk wc','Doa keluar wc','Sholat shubuh','Sholat dhuhur','Sholat ashar','Sholat magrib','Sholat isya','Sholat dhuha','Sholat tahajud','Sholat istikharoh','Sholat jenazah','Sholat gerhana','Sholat khouf','Sholat shafar','Sholat tarawih','Sholat witir'],
  Katolik: ['10 perintah Allah','5 perintah gereja','7 sakramen','Doa malaikat Tuhan dan ratu surga','Doa malam','Doa pagi','Doa sebelum makan','Doa setelah makan','Hukum kasih dengan penerapannya','Memimpin do’a rosario','Memimpin ibadat sabda/doa lingkungan','Pengakuan dosa','Syahadat singkat','Jawaban-jawaban misa/ekaristi','Perlengkapan Liturgi'],
  Kristen: ['10 Perintah Allah','Doa Bapa Kami','Doa Syafaat','Pengakuan Iman','Renungan','Sebutkan Dan Menjelaskan Buah Roh'],
  Hindu: ['Doa Akan Beraktivitas','Doa Bangun Pagi','Doa Mencuci Muka','Doa Berkumur','Doa Mandi','Doa Memohon Ampunan','Doa Mengenakan Pakaian','Doa Menggosok Gigi','Doa Mulai Belajar','Doa Orang Meninggal','Doa Sebelum Makan','Doa Sesudah Makan','Persembahyangan Secara Berurutan'],
  Budha: ['Doa Kepada Tuhan Yang Maha Esa','Doa Keselamatan “Pattumodana Paritta”','Doa Melancarkan Rejeki','Doa Mohon Kebahagiaan','Doa Mohon Kesuksesan','Doa Sebelum Makan','Doa Sebelum Tidur','Doa Setelah Makan','Doa Untuk Orang Tua','Jinapanjara Gatha','Paritta Namaskara Gatha']
};
const state = {
  apiUrl: localStorage.getItem('absensi_api_url') || '',
  students: [], filteredStudents: [], studentPage: 1, pageSize: 25,
  selectedWorship: '', scanner: null, scanning: false, scanLocked: false,
  settings: { school:'SMAN 1 Kota Gajah', principal:'', principalNip:'', teachers:[], selectedTeacher:{name:'',nip:''}, logo:'', principalSignature:'', teacherSignature:'' },
  recap: [], charts: [], hafalan: []
};
const $ = (id) => document.getElementById(id);
const qs = (s, root=document) => root.querySelector(s);
const qsa = (s, root=document) => [...root.querySelectorAll(s)];
const esc = (v='') => String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmtDate = (d=new Date()) => new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long',year:'numeric'}).format(d);
const isoDate = (d=new Date()) => { const x=new Date(d.getTime()-d.getTimezoneOffset()*60000); return x.toISOString().slice(0,10); };

function toast(message,type='success'){ const el=document.createElement('div'); el.className=`toast ${type}`; el.textContent=message; $('toastContainer').appendChild(el); setTimeout(()=>el.remove(),3500); }
function loading(show,text='Memproses...'){ $('loadingText').textContent=text; $('loadingOverlay').classList.toggle('show',show); }
function requireApi(){ if(!state.apiUrl){ toast('Isi URL Google Apps Script pada menu Setting terlebih dahulu.','error'); navigate('settings'); return false; } return true; }
function updateApiStatus(connected){
  const text = $('apiState');
  const dot = qs('.status-dot');
  if(!text) return;
  text.textContent = connected ? 'Terhubung' : (state.apiUrl ? 'Tidak terhubung' : 'Belum dikonfigurasi');
  if(dot){ dot.classList.toggle('online', !!connected); dot.classList.toggle('offline', !connected); }
}
async function testApi(){
  const url = $('apiUrlInput')?.value.trim() || state.apiUrl;
  if(!/^https:\/\/script\.google\.com\//.test(url)) return toast('Masukkan URL Web App Google Apps Script yang valid.','error');
  const old = state.apiUrl;
  state.apiUrl = url;
  try{
    loading(true,'Menguji koneksi Google Sheets...');
    const r = await api('ping');
    updateApiStatus(true);
    toast('Koneksi berhasil: '+(r.data?.spreadsheetName || 'Google Sheets terhubung.'));
  }catch(e){
    state.apiUrl = old;
    updateApiStatus(false);
    toast('Koneksi gagal: '+e.message,'error');
  }finally{ loading(false); }
}
async function api(action,payload={}){
  if(!requireApi()) throw new Error('API belum dikonfigurasi');
  const body = new URLSearchParams({ action, payload: JSON.stringify(payload) });
  const res = await fetch(state.apiUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body});
  const text = await res.text(); let data;
  try{ data=JSON.parse(text); }catch{ throw new Error('Respons API bukan JSON. Pastikan deployment Apps Script benar dan akses = Anyone.'); }
  if(!data.ok) throw new Error(data.message || 'Terjadi kesalahan pada server');
  return data;
}

function navigate(page){
  qsa('.page').forEach(x=>x.classList.remove('active')); qsa('.nav-item').forEach(x=>x.classList.remove('active'));
  $(`page-${page}`).classList.add('active'); qs(`.nav-item[data-page="${page}"]`)?.classList.add('active');
  const titles={dashboard:'Dashboard',students:'Data Siswa',attendance:'Absen Ibadah',recap:'Rekap Absen',charts:'Grafik',hafalan:'Laporan Hafalan',settings:'Setting'};
  $('pageTitle').textContent=titles[page]; $('sidebar').classList.remove('open');
  if(page==='students' && !state.students.length && state.apiUrl) loadStudents();
  if(page==='settings') fillSettingsForm();
  if(page==='hafalan'){ initHafalanForm(); if(state.apiUrl) loadHafalanReport(true); }
}

function qrText(nis){ return `SMAN1KG:${String(nis).trim()}`; }
function parseQr(text){ const s=String(text||'').trim(); return s.startsWith('SMAN1KG:') ? s.slice(8).trim() : s; }
function qrSvg(nis,cellSize=4,margin=2){
  const qr=qrcode(0,'M'); qr.addData(qrText(nis)); qr.make();
  return qr.createSvgTag({cellSize,margin,scalable:true});
}
function svgBlob(nis){ return new Blob([qrSvg(nis,8,4)],{type:'image/svg+xml;charset=utf-8'}); }
function safeFile(s){ return String(s).replace(/[\\/:*?"<>|]/g,'_').replace(/\s+/g,'_'); }
function downloadBlob(blob,filename){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }

async function loadDashboard(silent=false){
  if(!state.apiUrl) return updateApiStatus(false);
  try{ if(!silent) loading(true,'Memuat dashboard...'); const r=await api('getDashboard'); const d=r.data;
    $('statStudents').textContent=d.totalStudents||0; $('statToday').textContent=d.today||0; $('statWeek').textContent=d.week||0; $('statMonth').textContent=d.month||0; $('statSemester').textContent=d.semester||0;
    $('dashboardDate').textContent=fmtDate(new Date());
    const max=Math.max(1,...Object.values(d.todayByWorship||{}));
    $('todayWorshipList').innerHTML=WORSHIPS.map(w=>`<div class="worship-line"><b>${w}</b><div class="bar"><i style="width:${((d.todayByWorship?.[w]||0)/max)*100}%"></i></div><strong>${d.todayByWorship?.[w]||0}</strong></div>`).join('');
    $('recentAttendanceBody').innerHTML=(d.recent||[]).map(x=>`<tr><td>${esc(x.time)}</td><td>${esc(x.name)}</td><td>${esc(x.className)}</td><td><span class="badge">${esc(x.worship)}</span></td></tr>`).join('') || '<tr><td colspan="4">Belum ada data.</td></tr>';
    updateApiStatus(true); if(d.settings){ state.settings={...state.settings,...d.settings}; applySchoolBrand(); }
  }catch(e){ updateApiStatus(false); if(!silent) toast(e.message,'error'); } finally{ if(!silent) loading(false); }
}

async function loadStudents(){
  try{ loading(true,'Memuat data siswa...'); const r=await api('getStudents'); state.students=r.data||[]; state.studentPage=1; renderStudentFilters(); applyStudentFilter(); }
  catch(e){ toast(e.message,'error'); } finally{ loading(false); }
}
function renderStudentFilters(){
  const classes=[...new Set(state.students.map(s=>s.className).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id'));
  const options='<option value="">Semua kelas</option>'+classes.map(c=>`<option>${esc(c)}</option>`).join('');
  $('studentClassFilter').innerHTML=options; $('recapClass').innerHTML=options;
  $('qrClassSelect').innerHTML=classes.map(c=>`<option>${esc(c)}</option>`).join('');
}
function applyStudentFilter(){
  const q=$('studentSearch').value.toLowerCase().trim(), cls=$('studentClassFilter').value;
  state.filteredStudents=state.students.filter(s=>(!cls||s.className===cls)&&(!q||`${s.nis} ${s.name} ${s.className}`.toLowerCase().includes(q)));
  const pages=Math.max(1,Math.ceil(state.filteredStudents.length/state.pageSize)); state.studentPage=Math.min(state.studentPage,pages); renderStudents();
}
function renderStudents(){
  const start=(state.studentPage-1)*state.pageSize, rows=state.filteredStudents.slice(start,start+state.pageSize);
  $('studentsBody').innerHTML=rows.map(s=>`<tr><td><b>${esc(s.nis)}</b></td><td>${esc(s.name)}</td><td>${esc(s.className)}</td><td>${s.gender==='L'?'Laki-laki':'Perempuan'}</td><td><div class="qr-mini">${qrSvg(s.nis,2,1)}</div></td><td><div class="action-cell"><button class="btn secondary" onclick="downloadStudentQr('${encodeURIComponent(s.nis)}')">SVG</button><button class="btn secondary" onclick="editStudent('${encodeURIComponent(s.nis)}')">Edit</button><button class="btn danger" onclick="deleteStudent('${encodeURIComponent(s.nis)}')">Hapus</button></div></td></tr>`).join('') || '<tr><td colspan="6">Data tidak ditemukan.</td></tr>';
  const pages=Math.max(1,Math.ceil(state.filteredStudents.length/state.pageSize)); $('studentCounter').textContent=`${state.filteredStudents.length} siswa`; $('studentPageInfo').textContent=`${state.studentPage} / ${pages}`;
  $('prevStudentPage').disabled=state.studentPage<=1; $('nextStudentPage').disabled=state.studentPage>=pages;
}
window.downloadStudentQr=(encoded)=>{ const nis=decodeURIComponent(encoded); const s=state.students.find(x=>x.nis===nis); downloadBlob(svgBlob(nis),`QR_${safeFile(s?.className||'Siswa')}_${safeFile(s?.name||nis)}_${safeFile(nis)}.svg`); };
window.editStudent=(encoded)=>{ const nis=decodeURIComponent(encoded),s=state.students.find(x=>x.nis===nis); if(!s)return; $('studentOriginalNis').value=s.nis;$('studentNis').value=s.nis;$('studentName').value=s.name;$('studentClass').value=s.className;$('studentGender').value=s.gender;$('studentModalTitle').textContent='Edit Siswa';openModal('studentModal'); };
window.deleteStudent=async(encoded)=>{ const nis=decodeURIComponent(encoded),s=state.students.find(x=>x.nis===nis); if(!confirm(`Hapus ${s?.name||nis} dari data siswa?`))return; try{loading(true,'Menghapus siswa...');await api('deleteStudent',{nis});toast('Siswa dihapus.');await loadStudents();}catch(e){toast(e.message,'error');}finally{loading(false);} };

async function saveStudent(ev){ ev.preventDefault(); const data={ originalNis:$('studentOriginalNis').value.trim(), nis:$('studentNis').value.trim(), name:$('studentName').value.trim(), className:$('studentClass').value.trim(), gender:$('studentGender').value };
  if(!data.nis||!data.name||!data.className)return toast('Lengkapi data siswa.','error');
  try{loading(true,'Menyimpan siswa...');await api('saveStudent',data);closeModal('studentModal');toast('Data siswa tersimpan.');await loadStudents();}catch(e){toast(e.message,'error');}finally{loading(false);}
}

function downloadTemplate(){
  const ws=XLSX.utils.aoa_to_sheet([['NIS/NISN','Kelas','Nama Siswa','Jenis Kelamin'],['1234567890','X IPA 1','Contoh Siswa','L'],['1234567891','X IPA 1','Contoh Siswi','P']]); ws['!cols']=[{wch:18},{wch:15},{wch:30},{wch:16}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Data Siswa');XLSX.writeFile(wb,'Template_Data_Siswa.xlsx');
}
async function importExcel(file){
  try{ loading(true,'Membaca file Excel...'); const arr=await file.arrayBuffer(); const wb=XLSX.read(arr,{type:'array'}); const ws=wb.Sheets[wb.SheetNames[0]]; const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
    const normalized=rows.map((r,i)=>({nis:String(r['NIS/NISN']??r['NIS']??r['NISN']??'').trim(),className:String(r['Kelas']??r['KELAS']??'').trim(),name:String(r['Nama Siswa']??r['Nama']??r['NAMA']??'').trim(),gender:String(r['Jenis Kelamin']??r['JK']??'').trim().toUpperCase().startsWith('P')?'P':'L',row:i+2})).filter(x=>x.nis||x.name);
    if(!normalized.length) throw new Error('Tidak ada data yang terbaca. Gunakan template yang disediakan.'); if(normalized.length>2000) throw new Error('Maksimal 2.000 siswa per import.');
    const invalid=normalized.find(x=>!x.nis||!x.name||!x.className); if(invalid) throw new Error(`Data tidak lengkap pada baris ${invalid.row}.`);
    loading(true,`Mengunggah ${normalized.length} siswa...`); const r=await api('importStudents',{students:normalized}); toast(`${r.data.inserted} ditambah, ${r.data.updated} diperbarui.`); await loadStudents();
  }catch(e){toast(e.message,'error');}finally{loading(false);$('excelInput').value='';}
}

async function downloadClassQr(){
  const cls=$('qrClassSelect').value, students=state.students.filter(s=>s.className===cls); if(!students.length)return toast('Tidak ada siswa di kelas ini.','error');
  try{loading(true,`Membuat ${students.length} QR SVG...`);const zip=new JSZip();students.forEach(s=>zip.file(`QR_${safeFile(s.name)}_${safeFile(s.nis)}.svg`,qrSvg(s.nis,8,4)));zip.file('README.txt',`QR Absensi Ibadah - ${state.settings.school}\nKelas: ${cls}\nJumlah siswa: ${students.length}\nIsi QR: SMAN1KG:NIS/NISN`);const blob=await zip.generateAsync({type:'blob'});downloadBlob(blob,`QR_SVG_${safeFile(cls)}.zip`);closeModal('classQrModal');toast('ZIP QR SVG berhasil dibuat.');}catch(e){toast(e.message,'error');}finally{loading(false);}
}
function printAllCards(){
  if(!state.students.length)return toast('Muat data siswa terlebih dahulu.','error');
  const w=window.open('','_blank'); const logo=state.settings.logo?`<img src="${state.settings.logo}">`:'';
  const cards=state.students.map(s=>`<div class="card"><div class="head">${logo}<div><b>${esc(state.settings.school)}</b><span>Kartu QR Absensi Ibadah</span></div></div><div class="body"><div class="qr">${qrSvg(s.nis,5,2)}</div><div class="info"><h3>${esc(s.name)}</h3><p>${esc(s.nis)}</p><p>${esc(s.className)} • ${s.gender==='L'?'Laki-laki':'Perempuan'}</p></div></div></div>`).join('');
  w.document.write(`<!doctype html><html><head><title>Kartu QR Siswa</title><style>@page{size:A4;margin:8mm}*{box-sizing:border-box}body{font-family:Arial;margin:0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:7mm}.card{border:1px solid #b9c9c7;border-radius:10px;padding:8mm;break-inside:avoid;height:60mm}.head{display:flex;gap:8px;align-items:center;border-bottom:1px solid #ddd;padding-bottom:6px}.head img{width:30px;height:30px;object-fit:contain}.head b,.head span{display:block}.head b{font-size:11px}.head span{font-size:9px;color:#666}.body{display:flex;align-items:center;gap:10px;margin-top:8px}.qr{width:90px;height:90px}.qr svg{width:90px;height:90px}.info h3{font-size:13px;margin:0 0 6px}.info p{font-size:10px;margin:3px 0;color:#444}@media print{.no-print{display:none}}</style></head><body><div class="grid">${cards}</div><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);w.document.close();
}

function renderWorshipButtons(){ $('worshipButtons').innerHTML=WORSHIPS.map(w=>`<button class="worship-btn" data-worship="${w}">${w}</button>`).join(''); $('recapWorship').innerHTML='<option value="">Semua ibadah</option>'+WORSHIPS.map(w=>`<option>${w}</option>`).join(''); qsa('.worship-btn').forEach(b=>b.onclick=()=>{qsa('.worship-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.selectedWorship=b.dataset.worship;$('selectedWorship').textContent=state.selectedWorship;}); }
async function startScanner(){
  if(!state.selectedWorship)return toast('Pilih jenis ibadah terlebih dahulu.','error'); if(state.scanning)return;
  try{ $('qrReader').innerHTML=''; state.scanner=new Html5Qrcode('qrReader'); const cameras=await Html5Qrcode.getCameras(); if(!cameras.length)throw new Error('Kamera tidak ditemukan.'); const preferred=cameras.find(c=>/back|rear|environment/i.test(c.label))||cameras[cameras.length-1];
    await state.scanner.start(preferred.id,{fps:10,qrbox:{width:230,height:230},aspectRatio:1},async text=>{if(state.scanLocked)return;state.scanLocked=true;await submitAttendance(parseQr(text));setTimeout(()=>state.scanLocked=false,1800);}); state.scanning=true;$('startScanBtn').disabled=true;$('stopScanBtn').disabled=false;
  }catch(e){toast(`Kamera: ${e.message}`,'error');$('qrReader').innerHTML='<div class="camera-placeholder"><p>Gagal membuka kamera. Pastikan HTTPS dan izin kamera aktif.</p></div>';}
}
async function stopScanner(){ try{if(state.scanner&&state.scanning)await state.scanner.stop();}catch{} state.scanning=false;$('startScanBtn').disabled=false;$('stopScanBtn').disabled=true;$('qrReader').innerHTML='<div class="camera-placeholder"><div class="scan-frame"></div><p>Kamera belum aktif</p></div>'; }
async function submitAttendance(nis){
  if(!state.selectedWorship)return toast('Pilih jenis ibadah terlebih dahulu.','error'); if(!nis)return toast('NIS/NISN kosong.','error');
  try{ const r=await api('recordAttendance',{nis:String(nis).trim(),worship:state.selectedWorship}); const d=r.data; renderAttendanceResult(d,true); toast(`Absensi ${d.name} berhasil.`); loadDashboard(true); }
  catch(e){ renderAttendanceResult({message:e.message},false); toast(e.message,'error'); }
}
function renderAttendanceResult(d,ok){ const el=$('attendanceResult'); el.className=`attendance-result ${ok?'success':'error'}`; if(!ok){el.innerHTML=`<div class="big-icon">!</div><h3>Absensi ditolak</h3><p>${esc(d.message)}</p>`;return;} el.innerHTML=`<div class="student-result"><span class="badge">✓ TERCATAT</span><h2>${esc(d.name)}</h2><dl><dt>NIS/NISN</dt><dd>${esc(d.nis)}</dd><dt>Kelas</dt><dd>${esc(d.className)}</dd><dt>Jenis Kelamin</dt><dd>${d.gender==='L'?'Laki-laki':'Perempuan'}</dd><dt>Ibadah</dt><dd>${esc(d.worship)}</dd><dt>Waktu</dt><dd>${esc(d.time)}</dd></dl></div>`; }

async function loadRecap(){
  try{loading(true,'Memuat rekap...');const r=await api('getRecap',{period:$('recapPeriod').value,date:$('recapDate').value||isoDate(),worship:$('recapWorship').value,className:$('recapClass').value});state.recap=r.data.rows||[];$('recapTotal').textContent=r.data.total;$('recapUnique').textContent=r.data.uniqueStudents;$('recapRange').textContent=r.data.range;$('recapBody').innerHTML=state.recap.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.date)}</td><td>${esc(x.time)}</td><td>${esc(x.nis)}</td><td>${esc(x.name)}</td><td>${esc(x.className)}</td><td>${x.gender}</td><td><span class="badge">${esc(x.worship)}</span></td></tr>`).join('')||'<tr><td colspan="8">Tidak ada data.</td></tr>';}
  catch(e){toast(e.message,'error');}finally{loading(false);}
}
function printRecapPdf(){
  if(!state.recap.length)return toast('Tampilkan rekap terlebih dahulu.','error');
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  doc.setFontSize(15);doc.text(`Rekap Absensi Ibadah - ${state.settings.school}`,14,14);
  doc.setFontSize(9);doc.text(`Periode: ${$('recapRange').textContent} | Dicetak: ${fmtDate()} ${new Date().toLocaleTimeString('id-ID',{hour12:false})}`,14,20);
  doc.autoTable({startY:25,head:[['No','Tanggal','Waktu','NIS/NISN','Nama','Kelas','JK','Ibadah']],body:state.recap.map((x,i)=>[i+1,x.date,x.time,x.nis,x.name,x.className,x.gender,x.worship]),styles:{fontSize:7},headStyles:{fillColor:[15,118,110]},margin:{left:14,right:14,bottom:48}});
  let finalY=doc.lastAutoTable.finalY;
  if(finalY>148){doc.addPage();finalY=20;}
  const yLabel=170,yLine=190,yName=196,yNip=202;
  const leftX=20,rightX=225;
  doc.setFontSize(10);doc.text('Kepala Sekolah',leftX,yLabel);doc.text('Guru Agama',rightX,yLabel);
  const sigH=18,sigW=55;
  if(state.settings.principalSignature){try{doc.addImage(state.settings.principalSignature,'PNG',leftX,yLine-sigH-2,sigW,sigH,undefined,'FAST');}catch(e){}}
  if(state.settings.teacherSignature){try{doc.addImage(state.settings.teacherSignature,'PNG',rightX,yLine-sigH-2,sigW,sigH,undefined,'FAST');}catch(e){}}
  doc.setDrawColor(90,110,108);doc.line(leftX,yLine,leftX+55,yLine);doc.line(rightX,yLine,rightX+55,yLine);
  doc.setFontSize(10);doc.setFont(undefined,'bold');doc.text(state.settings.principal||'-',leftX,yName);doc.text(state.settings.selectedTeacher?.name||'-',rightX,yName);doc.setFont(undefined,'normal');
  doc.text(`NIP. ${state.settings.principalNip||'-'}`,leftX,yNip);doc.text(`NIP. ${state.settings.selectedTeacher?.nip||'-'}`,rightX,yNip);
  doc.setFontSize(7);doc.setFont(undefined,'normal');doc.setTextColor(100,100,100);doc.text('Created by Akhmad Khafidz K., S.Pd., Gr.',14,207);doc.setTextColor(0,0,0);
  doc.save(`Rekap_Absensi_${isoDate()}.pdf`);
}

let attendanceChart=null,worshipChart=null;
async function loadCharts(){
  try{loading(true,'Membuat grafik...');const r=await api('getChartData',{period:$('chartPeriod').value,date:$('chartDate').value||isoDate()});const d=r.data;
    attendanceChart?.destroy(); worshipChart?.destroy();
    attendanceChart=new Chart($('attendanceChart'),{type:'bar',data:{labels:d.labels,datasets:[{label:'Jumlah Absensi',data:d.values,backgroundColor:['#0f766e','#14b8a6','#2dd4bf','#5eead4','#99f6e4','#0d9488','#115e59']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{title:{display:true,text:`Tren Kehadiran (${d.range})`},legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}}});
    worshipChart=new Chart($('worshipChart'),{type:'doughnut',data:{labels:WORSHIPS,datasets:[{data:WORSHIPS.map(w=>d.byWorship[w]||0),backgroundColor:['#0f766e','#2563eb','#f59e0b','#7c3aed','#e11d48','#0891b2']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{title:{display:true,text:'Komposisi per Jenis Ibadah'},legend:{position:'bottom'}}}});
  }catch(e){toast(e.message,'error');}finally{loading(false);}
}

function initHafalanForm(){
  const classes=[...new Set(state.students.map(s=>s.className).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id'));
  const cls=$('hafalanClass'); if(!cls)return; const current=cls.value; cls.innerHTML='<option value="">Pilih kelas</option>'+classes.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join(''); if(classes.includes(current))cls.value=current;
  if(!$('hafalanDate').value)$('hafalanDate').value=isoDate();
  updateHafalanStudents(); updateHafalanSetoran();
}
function updateHafalanStudents(){
  const cls=$('hafalanClass')?.value||''; const sel=$('hafalanStudent'); if(!sel)return; const list=state.students.filter(s=>!cls||s.className===cls); const current=sel.value; sel.innerHTML='<option value="">Pilih nama siswa</option>'+list.map(s=>`<option value="${esc(s.nis)}">${esc(s.name)} — ${esc(s.nis)}</option>`).join(''); if(list.some(s=>s.nis===current))sel.value=current;
}
function updateHafalanSetoran(){
  const agama=$('hafalanReligion')?.value||''; const sel=$('hafalanSetoran'); if(!sel)return; const current=sel.value; const opts=HAFALAN_OPTIONS[agama]||[]; sel.innerHTML='<option value="">Pilih setoran</option>'+opts.map((x,i)=>`<option value="${esc(x)}">${i+1}. ${esc(x)}</option>`).join(''); if(opts.includes(current))sel.value=current;
}
async function saveHafalan(){
  const cls=$('hafalanClass').value,nis=$('hafalanStudent').value,date=$('hafalanDate').value,agama=$('hafalanReligion').value,setoran=$('hafalanSetoran').value;
  if(!cls||!nis||!date||!agama||!setoran)return toast('Lengkapi kelas, siswa, tanggal, agama, dan setoran.','error');
  try{loading(true,'Menyimpan setoran hafalan...');const r=await api('saveHafalan',{className:cls,nis,date,religion:agama,setoran});toast(r.data.message||'Laporan hafalan tersimpan.');await loadHafalanReport(true);}catch(e){const msg=String(e.message||e);if(msg.includes('Action tidak dikenali: saveHafalan')){toast('API Google Sheets masih versi lama. Update/deploy ulang Code.gs versi 1.4.1, lalu gunakan URL /exec terbaru di Setting.','error');}else{toast(msg,'error');}}finally{loading(false);}
}
async function loadHafalanReport(silent=false){
  if(!state.apiUrl)return;
  const p={className:$('hafalanClass')?.value||'',nis:$('hafalanStudent')?.value||'',date:$('hafalanDate')?.value||'',religion:$('hafalanReligion')?.value||'',setoran:$('hafalanSetoran')?.value||''};
  try{if(!silent)loading(true,'Memuat laporan hafalan...');const r=await api('getHafalanReport',p);const d=r.data;state.hafalan=d.rows||[];$('hafalanTotal').textContent=d.total||0;$('hafalanRange').textContent=d.range||'-';$('hafalanBody').innerHTML=state.hafalan.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.date)}</td><td>${esc(x.className)}</td><td>${esc(x.nis)}</td><td>${esc(x.name)}</td><td><span class="badge">${esc(x.religion)}</span></td><td>${esc(x.setoran)}</td></tr>`).join('')||'<tr><td colspan="7">Belum ada data hafalan.</td></tr>';}catch(e){if(!silent)toast(e.message,'error');}finally{if(!silent)loading(false);}
}
function printHafalanPdf(){
  if(!state.hafalan?.length)return toast('Tampilkan laporan hafalan terlebih dahulu.','error');
  const {jsPDF}=window.jspdf; const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  doc.setFontSize(15);doc.text(`Laporan Hafalan - ${state.settings.school}`,14,14);doc.setFontSize(9);doc.text(`Periode: ${$('hafalanDate').value||'-'} | Dicetak: ${fmtDate()} ${new Date().toLocaleTimeString('id-ID',{hour12:false})}`,14,20);
  doc.autoTable({startY:25,head:[['No','Tanggal','Kelas','NIS/NISN','Nama','Agama','Setoran']],body:state.hafalan.map((x,i)=>[i+1,x.date,x.className,x.nis,x.name,x.religion,x.setoran]),styles:{fontSize:7},headStyles:{fillColor:[15,118,110]},margin:{left:14,right:14,bottom:48}});
  const yLabel=170,yLine=190,yName=196,yNip=202,leftX=20,rightX=225; doc.setFontSize(10);doc.text('Kepala Sekolah',leftX,yLabel);doc.text('Guru Agama',rightX,yLabel);
  const sigH=18,sigW=55;if(state.settings.principalSignature){try{doc.addImage(state.settings.principalSignature,'PNG',leftX,yLine-sigH-2,sigW,sigH,undefined,'FAST');}catch(e){}}if(state.settings.teacherSignature){try{doc.addImage(state.settings.teacherSignature,'PNG',rightX,yLine-sigH-2,sigW,sigH,undefined,'FAST');}catch(e){}}
  doc.setDrawColor(90,110,108);doc.line(leftX,yLine,leftX+55,yLine);doc.line(rightX,yLine,rightX+55,yLine);doc.setFontSize(10);doc.setFont(undefined,'bold');doc.text(state.settings.principal||'-',leftX,yName);doc.text(state.settings.selectedTeacher?.name||'-',rightX,yName);doc.setFont(undefined,'normal');doc.text(`NIP. ${state.settings.principalNip||'-'}`,leftX,yNip);doc.text(`NIP. ${state.settings.selectedTeacher?.nip||'-'}`,rightX,yNip);
  doc.setFontSize(7);doc.setFont(undefined,'normal');doc.setTextColor(100,100,100);doc.text('Created by Akhmad Khafidz K., S.Pd., Gr.',14,207);doc.setTextColor(0,0,0);
  doc.save(`Laporan_Hafalan_${isoDate()}.pdf`);
}

function addTeacherRow(t={name:'',nip:''}){ const row=document.createElement('div');row.className='teacher-row';row.innerHTML=`<input class="teacher-name" placeholder="Nama guru" value="${esc(t.name)}"><input class="teacher-nip" placeholder="NIP" value="${esc(t.nip)}"><button class="btn danger" type="button">Hapus</button>`;row.querySelector('button').onclick=()=>{row.remove();refreshTeacherSelect();};$('teachersList').appendChild(row);refreshTeacherSelect(); }
function refreshTeacherSelect(){ const sel=$('settingTeacherSelect'); if(!sel)return; const current=state.settings.selectedTeacher?.name||''; const teachers=qsa('.teacher-row').map(r=>({name:qs('.teacher-name',r).value.trim(),nip:qs('.teacher-nip',r).value.trim()})).filter(t=>t.name||t.nip); sel.innerHTML='<option value="">Pilih guru agama</option>'+teachers.map((t,i)=>`<option value="${i}">${esc(t.name||t.nip)}</option>`).join(''); const idx=teachers.findIndex(t=>t.name===current); if(idx>=0)sel.value=String(idx); else if(teachers.length===1)sel.value='0'; }
function fillSettingsForm(){
  $('apiUrlInput').value=state.apiUrl;$('settingSchool').value=state.settings.school||'';$('settingPrincipal').value=state.settings.principal||'';$('settingPrincipalNip').value=state.settings.principalNip||'';
  $('teachersList').innerHTML='';(state.settings.teachers?.length?state.settings.teachers:[{name:'',nip:''}]).forEach(addTeacherRow);refreshTeacherSelect();
  if(state.settings.logo){$('logoPreview').src=state.settings.logo;$('logoPreview').hidden=false;$('logoPlaceholder').hidden=true;}
  if(state.settings.principalSignature){$('principalSignatureImg').src=state.settings.principalSignature;$('principalSignatureImg').hidden=false;$('principalSignaturePlaceholder').hidden=true;}
  if(state.settings.teacherSignature){$('teacherSignatureImg').src=state.settings.teacherSignature;$('teacherSignatureImg').hidden=false;$('teacherSignaturePlaceholder').hidden=true;}
}
function applySchoolBrand(){ const s=state.settings.school||'SMAN 1 Kota Gajah';$('brandSchool').textContent=s;$('heroSchool').textContent=s;if(state.settings.logo){$('sidebarLogo').src=state.settings.logo;$('sidebarLogo').hidden=false;$('brandFallback').hidden=true;} }
async function readLogo(file){ if(!file)return ''; if(file.size>2*1024*1024)throw new Error('Logo maksimal 2 MB.'); const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)}); return await resizeImage(data,320,320,.82,'image/jpeg'); }
async function readSignature(file){ if(!file)return ''; if(file.size>2*1024*1024)throw new Error('File TTD maksimal 2 MB.'); const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)}); return await resizeImage(data,500,180,.9,'image/png'); }
function resizeImage(src,maxW,maxH,quality,mime='image/jpeg'){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>{let w=img.width,h=img.height;const scale=Math.min(1,maxW/w,maxH/h);w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale));const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.clearRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);res(c.toDataURL(mime,quality));};img.onerror=rej;img.src=src;});}
async function saveSettings(){
  const url=$('apiUrlInput').value.trim(); if(!/^https:\/\/script\.google\.com\//.test(url))return toast('Masukkan URL Web App Google Apps Script yang valid.','error'); state.apiUrl=url; localStorage.setItem('absensi_api_url',url);
  const teachers=qsa('.teacher-row').map(r=>({name:qs('.teacher-name',r).value.trim(),nip:qs('.teacher-nip',r).value.trim()})).filter(t=>t.name||t.nip); const selectedIndex=$('settingTeacherSelect').value; const selectedTeacher=selectedIndex!==''&&teachers[Number(selectedIndex)]?teachers[Number(selectedIndex)]:{name:'',nip:''};
  const logoFile=$('logoInput').files[0],principalSigFile=$('principalSignatureInput').files[0],teacherSigFile=$('teacherSignatureInput').files[0]; let logo=state.settings.logo||'',principalSignature=state.settings.principalSignature||'',teacherSignature=state.settings.teacherSignature||'';
  try{loading(true,'Menyimpan setting...');if(logoFile)logo=await readLogo(logoFile);if(principalSigFile)principalSignature=await readSignature(principalSigFile);if(teacherSigFile)teacherSignature=await readSignature(teacherSigFile);
    const settings={school:$('settingSchool').value.trim()||'SMAN 1 Kota Gajah',principal:$('settingPrincipal').value.trim(),principalNip:$('settingPrincipalNip').value.trim(),teachers,selectedTeacher,logo,principalSignature,teacherSignature};
    await api('saveSettings',settings);state.settings=settings;applySchoolBrand();updateApiStatus(true);toast('Setting berhasil disimpan.');
  }catch(e){toast(e.message,'error');updateApiStatus(false);}finally{loading(false);}
}
function openModal(id){$(id).classList.add('open');$(id).setAttribute('aria-hidden','false');} function closeModal(id){$(id).classList.remove('open');$(id).setAttribute('aria-hidden','true');}
function bindEvents(){
  qsa('.nav-item').forEach(b=>b.onclick=()=>navigate(b.dataset.page));$('menuToggle').onclick=()=>$('sidebar').classList.toggle('open');$('refreshBtn').onclick=()=>loadDashboard();
  $('studentSearch').oninput=()=>{state.studentPage=1;applyStudentFilter();};$('studentClassFilter').onchange=()=>{state.studentPage=1;applyStudentFilter();};$('prevStudentPage').onclick=()=>{state.studentPage--;renderStudents();};$('nextStudentPage').onclick=()=>{state.studentPage++;renderStudents();};
  $('addStudentBtn').onclick=()=>{$('studentForm').reset();$('studentOriginalNis').value='';$('studentModalTitle').textContent='Tambah Siswa';openModal('studentModal');};$('studentForm').onsubmit=saveStudent;
  qsa('[data-close-modal]').forEach(b=>b.onclick=()=>closeModal(b.closest('.modal').id));qsa('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)}));
  $('downloadTemplateBtn').onclick=downloadTemplate;$('uploadExcelBtn').onclick=()=>$('excelInput').click();$('excelInput').onchange=e=>e.target.files[0]&&importExcel(e.target.files[0]);
  $('downloadClassQrBtn').onclick=()=>{if(!state.students.length)return toast('Muat data siswa terlebih dahulu.','error');openModal('classQrModal');};$('confirmClassQrBtn').onclick=downloadClassQr;$('printQrBtn').onclick=printAllCards;
  $('startScanBtn').onclick=startScanner;$('stopScanBtn').onclick=stopScanner;$('manualAttendBtn').onclick=()=>{const nis=$('manualNis').value.trim();submitAttendance(nis);$('manualNis').value='';};$('manualNis').addEventListener('keydown',e=>{if(e.key==='Enter')$('manualAttendBtn').click()});
  $('loadRecapBtn').onclick=loadRecap;$('printPdfBtn').onclick=printRecapPdf;$('loadChartBtn').onclick=loadCharts;$('hafalanClass').onchange=()=>{updateHafalanStudents();loadHafalanReport(true)};$('hafalanReligion').onchange=()=>{updateHafalanSetoran();loadHafalanReport(true)};$('hafalanStudent').onchange=()=>loadHafalanReport(true);$('hafalanDate').onchange=()=>loadHafalanReport(true);$('hafalanSetoran').onchange=()=>loadHafalanReport(true);$('saveHafalanBtn').onclick=saveHafalan;$('loadHafalanBtn').onclick=()=>loadHafalanReport(false);$('printHafalanPdfBtn').onclick=printHafalanPdf;
  $('addTeacherBtn').onclick=()=>addTeacherRow();$('teachersList').addEventListener('input',refreshTeacherSelect);$('saveSettingsBtn').onclick=saveSettings;$('testApiBtn').onclick=testApi;$('logoInput').onchange=async e=>{try{const data=await readLogo(e.target.files[0]);$('logoPreview').src=data;$('logoPreview').hidden=false;$('logoPlaceholder').hidden=true;}catch(err){toast(err.message,'error')}};$('principalSignatureInput').onchange=async e=>{try{const data=await readSignature(e.target.files[0]);$('principalSignatureImg').src=data;$('principalSignatureImg').hidden=false;$('principalSignaturePlaceholder').hidden=true;}catch(err){toast(err.message,'error')}};$('teacherSignatureInput').onchange=async e=>{try{const data=await readSignature(e.target.files[0]);$('teacherSignatureImg').src=data;$('teacherSignatureImg').hidden=false;$('teacherSignaturePlaceholder').hidden=true;}catch(err){toast(err.message,'error')}};
}

document.addEventListener('DOMContentLoaded',async()=>{
  $('todayLabel').textContent=fmtDate();$('dashboardDate').textContent=fmtDate();$('recapDate').value=isoDate();$('chartDate').value=isoDate();$('hafalanDate').value=isoDate();renderWorshipButtons();bindEvents();applySchoolBrand();fillSettingsForm();initHafalanForm();
  if(state.apiUrl){ await loadDashboard(); setInterval(()=>{ if(document.visibilityState==='visible')loadDashboard(true); },30000); }
});
