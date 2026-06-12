import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  getFirestore,
  writeBatch,
  doc,
  collection,
  query,
  getDocs,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { firebaseConfig, FIRESTORE_COLLECTION, FIRESTORE_METADATA_DOC } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");
const authMessage = document.getElementById("authMessage");
const uploadShell = document.getElementById("uploadShell");
const signedOutState = document.getElementById("signedOutState");
const sessionChip = document.getElementById("sessionChip");
const previewBtn = document.getElementById("previewBtn");
const publishBtn = document.getElementById("publishBtn");
const uploadMessage = document.getElementById("uploadMessage");
const previewTableBody = document.getElementById("previewTableBody");
const parsedRows = document.getElementById("parsedRows");
const statusRows = document.getElementById("statusRows");
const parsedAy = document.getElementById("parsedAy");

let parsedDataset = [];

function setAuthUi(user) {
  const signedIn = Boolean(user);
  uploadShell.classList.toggle("hidden", !signedIn);
  signedOutState.classList.toggle("hidden", signedIn);
  logoutBtn.classList.toggle("hidden", !signedIn);
  sessionChip.textContent = signedIn ? `Signed in: ${user.email}` : "Signed out";
}

function normalizeStatus(value) {
  return value ? String(value).trim() : "";
}

function parseRefund(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatPreviewAmount(value) {
  if (value === null || value === undefined) {
    return "-";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function renderPreview(rows) {
  previewTableBody.innerHTML = "";
  const previewRows = rows.slice(0, 8);
  if (!previewRows.length) {
    previewTableBody.innerHTML = '<tr><td colspan="5" class="subtle">No valid rows parsed from the workbook.</td></tr>';
    return;
  }

  previewRows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.name}</td>
      <td>${row.pan}</td>
      <td>${row.codeNo}</td>
      <td>${formatPreviewAmount(row.refundAmount)}</td>
      <td>${row.refundStatus || "-"}</td>
    `;
    previewTableBody.appendChild(tr);
  });
}

function parseWorkbook(file, assessmentYear) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });

        if (rows.length < 3) {
          reject(new Error("Workbook does not contain the expected table structure."));
          return;
        }

        const headerRowIndex = rows.findIndex((row) => row.includes("PAN No") && row.includes("Refund"));
        if (headerRowIndex === -1) {
          reject(new Error("Could not find the expected header row in the workbook."));
          return;
        }

        const headers = rows[headerRowIndex].map((value) => String(value).trim());
        const dataRows = rows.slice(headerRowIndex + 1);

        const records = dataRows
          .filter((row) => row.some((cell) => String(cell).trim() !== ""))
          .map((row) => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index];
            });

            return {
              assessmentYear,
              serialNo: obj["S.No"] ? Number(obj["S.No"]) : null,
              codeNo: String(obj["Code No"] || "").trim(),
              name: String(obj["Name"] || "").trim(),
              pan: String(obj["PAN No"] || "").trim().toUpperCase(),
              refundAmount: parseRefund(obj["Refund"]),
              refundStatus: normalizeStatus(obj["Refund Status"]),
              uploadedSheetName: workbook.SheetNames[0]
            };
          })
          .filter((record) => record.pan && record.name);

        resolve(records);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Could not read the workbook file."));
    reader.readAsArrayBuffer(file);
  });
}

function getFriendlyFirebaseError(error) {
  const code = error?.code || "";

  if (code === "permission-denied" || code === "firestore/permission-denied") {
    return "Publishing failed because Firestore is blocking write access. Update your Firestore rules to allow authenticated office staff to write.";
  }

  if (code === "unauthenticated" || code === "firestore/unauthenticated") {
    return "Publishing failed because the Firebase session is not authenticated. Sign in again and retry.";
  }

  if (code === "auth/invalid-credential") {
    return "Sign-in failed because the email or password is invalid.";
  }

  if (code === "auth/user-not-found") {
    return "Sign-in failed because this Firebase user does not exist yet.";
  }

  if (code === "auth/wrong-password") {
    return "Sign-in failed because the password is incorrect.";
  }

  return error?.message || "An unexpected Firebase error occurred.";
}

async function publishRecords(records, userEmail, assessmentYear) {
  const existingQuery = query(collection(db, FIRESTORE_COLLECTION));
  const existingSnap = await getDocs(existingQuery);

  if (!existingSnap.empty) {
    for (let start = 0; start < existingSnap.docs.length; start += 400) {
      const deleteBatch = writeBatch(db);
      existingSnap.docs.slice(start, start + 400).forEach((existingDoc) => {
        deleteBatch.delete(existingDoc.ref);
      });
      await deleteBatch.commit();
    }
  }

  const batchSize = 400;
  for (let start = 0; start < records.length; start += batchSize) {
    const batch = writeBatch(db);
    const chunk = records.slice(start, start + batchSize);

    chunk.forEach((record) => {
      const safePan = record.pan.replace(/[^A-Z0-9]/g, "");
      const safeCode = (record.codeNo || "no-code").replace(/[^A-Z0-9-]/gi, "");
      const docId = `${assessmentYear}_${safePan}_${safeCode}`;
      const ref = doc(collection(db, FIRESTORE_COLLECTION), docId);

      batch.set(ref, {
        ...record,
        uploadedBy: userEmail,
        uploadedAt: serverTimestamp()
      });
    });

    await batch.commit();
  }

  await setDoc(doc(db, FIRESTORE_METADATA_DOC), {
    assessmentYear,
    recordCount: records.length,
    uploadedBy: userEmail,
    uploadedAt: serverTimestamp()
  });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  authMessage.className = "status-message warning";
  authMessage.textContent = "Signing in...";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    authMessage.className = "status-message success";
    authMessage.textContent = "Signed in successfully.";
    loginForm.reset();
  } catch (error) {
    authMessage.className = "status-message error";
    authMessage.textContent = getFriendlyFirebaseError(error);
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  authMessage.className = "status-message success";
  authMessage.textContent = "Signed out successfully.";
});

previewBtn.addEventListener("click", async () => {
  const file = document.getElementById("excelFile").files[0];
  const assessmentYear = document.getElementById("uploadAssessmentYear").value;

  uploadMessage.className = "status-message error";

  if (!file) {
    uploadMessage.textContent = "Choose an Excel file first.";
    return;
  }

  try {
    uploadMessage.className = "status-message warning";
    uploadMessage.textContent = "Parsing workbook...";
    parsedDataset = await parseWorkbook(file, assessmentYear);
    parsedRows.textContent = String(parsedDataset.length);
    statusRows.textContent = String(parsedDataset.filter((row) => row.refundStatus).length);
    parsedAy.textContent = `AY ${assessmentYear}`;
    renderPreview(parsedDataset);
    uploadMessage.className = "status-message success";
    uploadMessage.textContent = "Workbook parsed successfully. Review the preview and publish when ready.";
  } catch (error) {
    uploadMessage.className = "status-message error";
    uploadMessage.textContent = `Parsing failed: ${error.message}`;
  }
});

publishBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const assessmentYear = document.getElementById("uploadAssessmentYear").value;

  if (!user) {
    uploadMessage.className = "status-message error";
    uploadMessage.textContent = "Sign in before publishing.";
    return;
  }

  if (!parsedDataset.length) {
    uploadMessage.className = "status-message error";
    uploadMessage.textContent = "Preview a workbook before publishing.";
    return;
  }

  try {
    uploadMessage.className = "status-message warning";
    uploadMessage.textContent = "Publishing records to Firebase and replacing the existing dataset...";
    await publishRecords(parsedDataset, user.email || "office-user", assessmentYear);
    uploadMessage.className = "status-message success";
    uploadMessage.textContent = `Published ${parsedDataset.length} records to Firebase successfully and replaced the previous dataset.`;
  } catch (error) {
    uploadMessage.className = "status-message error";
    uploadMessage.textContent = getFriendlyFirebaseError(error);
  }
});

onAuthStateChanged(auth, (user) => {
  setAuthUi(user);
});
