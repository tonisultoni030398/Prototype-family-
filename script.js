
const SUPABASE_URL =
  "https://tvnlsqehirjvfjxngrjq.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_eQhqVoNWBvkByfM-ocJ5qA_LRYbJdoL";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const $ = id => document.getElementById(id);

const diagram = $("diagram");
const jumlah = $("jumlah");
const formDialog = $("formDialog");
const formAnggota = $("formAnggota");
const namaInput = $("nama");
const orangTuaInput = $("orangTua");
const loginPanel = $("loginPanel");

let keluarga = [];
let userAktif = null;

function pesan(teks) {
  const el = $("authMessage");
  if (el) el.textContent = teks;
  else alert(teks);
}

// Login atau pendaftaran
$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  pesan("Memproses login...");

  const { data, error } = await db.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value
  });

  if (error) {
    pesan("Login gagal: " + error.message);
    return;
  }

  userAktif = data.user;
  await bukaAplikasi();
});

$("daftarBtn").addEventListener("click", async () => {
  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || password.length < 6) {
    pesan("Isi email dan password minimal 6 karakter.");
    return;
  }

  pesan("Mendaftarkan akun...");

  const { data, error } = await db.auth.signUp({
    email,
    password
  });

  if (error) {
    pesan("Pendaftaran gagal: " + error.message);
    return;
  }

  if (data.session) {
    userAktif = data.user;
    await bukaAplikasi();
  } else {
    pesan("Periksa email untuk verifikasi, lalu login.");
  }
});

// Periksa sesi saat halaman dibuka
async function mulai() {
  const { data, error } = await db.auth.getSession();

  if (error) {
    pesan("Gagal memeriksa sesi: " + error.message);
    return;
  }

  if (data.session) {
    userAktif = data.session.user;
    await bukaAplikasi();
  } else {
    tampilkanLogin();
  }
}

function tampilkanLogin() {
  document.body.classList.remove("sudah-login");
  loginPanel.hidden = false;
}

async function bukaAplikasi() {
  document.body.classList.add("sudah-login");
  loginPanel.hidden = true;
  await muatKeluarga();
}

// Ambil data milik akun yang sedang login
async function muatKeluarga() {
  const { data, error } = await db
    .from("anggota_keluarga")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    alert("Gagal memuat anggota: " + error.message);
    return;
  }

  keluarga = data || [];
  tampilkanKeluarga();
}

// Render diagram
function tampilkanKeluarga() {
  diagram.innerHTML = "";
  jumlah.textContent = keluarga.length + " anggota";

  const akar = keluarga.filter(p => !p.orang_tua_id);

  if (keluarga.length === 0) {
    diagram.textContent =
      "Belum ada anggota. Tekan + Anggota untuk mulai.";
  }

  akar.forEach(p => {
    diagram.appendChild(buatKartu(p));
  });

  perbaruiPilihanOrangTua();
}

function buatKartu(orang) {
  const wadah = document.createElement("div");
  wadah.className = "keluarga";

  const kartu = document.createElement("div");
  kartu.className = "kartu";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = orang.nama
    .split(/\s+/)
    .map(k => k[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const nama = document.createElement("div");
  nama.className = "nama";
  nama.textContent = orang.nama;

  const hapus = document.createElement("button");
  hapus.className = "hapus";
  hapus.type = "button";
  hapus.textContent = "Hapus";
  hapus.addEventListener("click", () => hapusAnggota(orang));

  kartu.append(avatar, nama, hapus);
  wadah.appendChild(kartu);

  const anak = keluarga.filter(
    p => p.orang_tua_id === orang.id
  );

  if (anak.length) {
    const garis = document.createElement("div");
    garis.className = "penghubung";
    wadah.appendChild(garis);

    const kelompok = document.createElement("div");
    kelompok.className = "anak";

    anak.forEach(p => kelompok.appendChild(buatKartu(p)));
    wadah.appendChild(kelompok);
  }

  return wadah;
}

function perbaruiPilihanOrangTua() {
  const nilaiLama = orangTuaInput.value;

  orangTuaInput.innerHTML =
    '<option value="">Generasi paling atas</option>';

  keluarga.forEach(p => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = p.nama;
    orangTuaInput.appendChild(option);
  });

  orangTuaInput.value = nilaiLama;
}

// Tambah anggota
$("tambahBtn").addEventListener("click", () => {
  formAnggota.reset();
  formDialog.showModal();
});

$("batalBtn").addEventListener("click", () => {
  formDialog.close();
});

formAnggota.addEventListener("submit", async e => {
  e.preventDefault();

  if (!userAktif) {
    alert("Silakan login terlebih dahulu.");
    return;
  }

  const nama = namaInput.value.trim();
  if (!nama) return;

  const orangTua = orangTuaInput.value
    ? Number(orangTuaInput.value)
    : null;

  const { error } = await db
    .from("anggota_keluarga")
    .insert({
      user_id: userAktif.id,
      nama,
      orang_tua_id: orangTua
    });

  if (error) {
    alert("Gagal menyimpan: " + error.message);
    return;
  }

  formDialog.close();
  formAnggota.reset();
  await muatKeluarga();
});

// Hapus anggota beserta seluruh keturunannya
async function hapusAnggota(orang) {
  if (!confirm(
    `Hapus ${orang.nama} beserta keturunannya jika ada?`
  )) return;

  const daftar = [orang.id];

  for (let i = 0; i < daftar.length; i++) {
    keluarga
      .filter(p => p.orang_tua_id === daftar[i])
      .forEach(p => {
        if (!daftar.includes(p.id)) daftar.push(p.id);
      });
  }

  const { error } = await db
    .from("anggota_keluarga")
    .delete()
    .in("id", daftar);

  if (error) {
    alert("Gagal menghapus: " + error.message);
    return;
  }

  await muatKeluarga();
}

// Mulai aplikasi
mulai();