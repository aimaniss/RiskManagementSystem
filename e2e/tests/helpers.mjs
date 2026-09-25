// e2e/tests/helpers.mjs — Bantuan log masuk API + suntikan token sesi ke UI.
// Simpan token dalam localStorage.token (skema asal app) supaya spek UI boleh
// terus menguji pandangan per peranan tanpa perlu melalui LoginModal.

export const API = "http://localhost:5001/api";

// Kredensial ujian = data sebenar dalam DB (seed). Kata laluan '123' ialah
// legasi plaintext (fallback + rehash-on-login); '1234'/bcrypt untuk Admin.
export const CREDENTIALS = {
  admin: { staff_id: "UKMH001", katalaluan: "1234", label: "Admin" },
  executive: { staff_id: "UKMH002", katalaluan: "123", label: "Executive" },
  ketuaSubsidiari: { staff_id: "UKMM0123", katalaluan: "123", label: "Ketua Subsidiari" },
  staff: { staff_id: "UKMDG1237", katalaluan: "123", label: "Staff" },
  viewer: { staff_id: "UKMH112", katalaluan: "123", label: "Viewer" },
};

export async function apiLogin(request, { staff_id, katalaluan }) {
  const res = await request.post(`${API}/auth/login`, {
    data: { staff_id, katalaluan },
  });
  if (!res.ok()) {
    throw new Error(`Login gagal ${staff_id}: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return {
    ...body,
    auth: { Authorization: `Bearer ${body.token}` },
  };
}

export async function sealSession(page, token) {
  await page.goto("/");
  await page.evaluate((t) => localStorage.setItem("token", t), token);
  await page.reload();
}