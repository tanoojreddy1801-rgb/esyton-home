import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  limit,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { firebaseConfig, FIRESTORE_COLLECTION, FIRESTORE_METADATA_DOC } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const lookupForm = document.getElementById("clientLookupForm");
const lookupMessage = document.getElementById("lookupMessage");
const emptyState = document.getElementById("emptyState");
const resultCard = document.getElementById("resultCard");
const resultTitle = document.getElementById("resultTitle");
const resultBadge = document.getElementById("resultBadge");
const resultSummary = document.getElementById("resultSummary");
const factName = document.getElementById("factName");
const factPan = document.getElementById("factPan");
const factCode = document.getElementById("factCode");
const factRefund = document.getElementById("factRefund");
const timeline = document.getElementById("timeline");
const dataSourceChip = document.getElementById("dataSourceChip");
const datasetMetaText = document.getElementById("datasetMetaText");

const uiText = {
  en: {
    pageTitle: "Track Your Refund",
    pageSubtitle: "Enter PAN and assessment year to fetch the latest office-published status from the central dataset.",
    backendChip: "Updated on real-time",
    languageTitle: "Choose Language",
    languageSubtitle: "Switch the client portal between English, Kannada, Telugu, and Hindi.",
    panLabel: "PAN",
    assessmentYearLabel: "Assessment Year",
    assessmentYearPlaceholder: "Select assessment year",
    checkStatusBtn: "Check status",
    sampleFillBtn: "Use sample PAN",
    workflowTitle: "How this works:",
    workflowItem1: "Office staff upload the latest Excel on the secure office page.",
    workflowItem2: "The workbook is parsed and its rows are published into Firebase Firestore.",
    workflowItem3: "This client page queries the latest centralized record by PAN and assessment year.",
    summaryTitle: "Status Summary",
    summarySubtitle: "A cleaner, client-friendly explanation generated from the uploaded office dataset.",
    recordLabel: "Refund Record",
    factNameLabel: "Client Name",
    factPanLabel: "PAN",
    factCodeLabel: "Code No",
    factRefundLabel: "Refund Amount",
    meaningTitle: "What this usually means",
    datasetFreshnessLabel: "Dataset freshness:",
    emptyState: "Enter the PAN and assessment year to fetch the latest published refund record.",
    awaitingLookup: "Awaiting lookup",
    noDatasetYet: "No dataset yet",
    metadataUnavailable: "Metadata unavailable",
    latestUploadPrefix: "Latest upload:",
    metadataMissing: "No office-upload metadata has been published yet.",
    metadataTemplate: (uploadedLabel, uploadedBy, recordCount) => `Latest upload: ${uploadedLabel}. Uploaded by ${uploadedBy}. Records published: ${recordCount}.`,
    metadataError: (message) => `Could not read dataset metadata: ${message}`,
    lookupLoading: "Checking the latest office-published record...",
    lookupSuccess: "Latest record fetched successfully.",
    lookupNotFound: "No record was found for that PAN and assessment year.",
    invalidPan: "Enter a valid PAN in the format ABCDE1234F.",
    selectAy: "Select an assessment year.",
    lookupFailed: (message) => `Lookup failed: ${message}`,
    notAvailable: "Not available",
    statusPending: "Status pending update",
    portalInsight: "Portal insight",
    uploadByFallback: "office staff"
  },
  kn: {
    pageTitle: "ನಿಮ್ಮ ಮರುಪಾವತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ",
    pageSubtitle: "ಇತ್ತೀಚಿನ ಕಚೇರಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ಸ್ಥಿತಿಯನ್ನು ಪಡೆಯಲು PAN ಮತ್ತು ಮೌಲ್ಯಮಾಪನ ವರ್ಷವನ್ನು ನಮೂದಿಸಿ.",
    backendChip: "ರಿಯಲ್-ಟೈಮ್ ನವೀಕರಣ",
    languageTitle: "ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ",
    languageSubtitle: "ಕ್ಲೈಂಟ್ ಪೋರ್ಟಲ್ ಅನ್ನು English, Kannada, Telugu ಮತ್ತು Hindi ನಡುವೆ ಬದಲಾಯಿಸಿ.",
    panLabel: "PAN",
    assessmentYearLabel: "ಮೌಲ್ಯಮಾಪನ ವರ್ಷ",
    assessmentYearPlaceholder: "ಮೌಲ್ಯಮಾಪನ ವರ್ಷ ಆಯ್ಕೆಮಾಡಿ",
    checkStatusBtn: "ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಿ",
    sampleFillBtn: "ನಮೂನಾ PAN ಬಳಸಿ",
    workflowTitle: "ಇದು ಹೇಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ:",
    workflowItem1: "ಕಚೇರಿ ಸಿಬ್ಬಂದಿ ಸುರಕ್ಷಿತ ಕಚೇರಿ ಪುಟದಲ್ಲಿ ಇತ್ತೀಚಿನ Excel ಅನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡುತ್ತಾರೆ.",
    workflowItem2: "ವರ್ಕ್‌ಬುಕ್ ಪಾರ್ಸ್ ಆಗಿ ಅದರ ಸಾಲುಗಳು Firebase Firestore ಗೆ ಪ್ರಕಟವಾಗುತ್ತವೆ.",
    workflowItem3: "ಈ ಕ್ಲೈಂಟ್ ಪುಟವು PAN ಮತ್ತು ಮೌಲ್ಯಮಾಪನ ವರ್ಷದ ಆಧಾರದ ಮೇಲೆ ಇತ್ತೀಚಿನ ಕೇಂದ್ರೀಕೃತ ದಾಖಲೆಯನ್ನು ಹುಡುಕುತ್ತದೆ.",
    summaryTitle: "ಸ್ಥಿತಿ ಸಾರಾಂಶ",
    summarySubtitle: "ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ಕಚೇರಿ ಡೇಟಾಸೆಟ್ ಆಧರಿಸಿ ರಚಿಸಲಾದ ಸುಲಭ ವಿವರಣೆ.",
    recordLabel: "ಮರುಪಾವತಿ ದಾಖಲೆ",
    factNameLabel: "ಗ್ರಾಹಕರ ಹೆಸರು",
    factPanLabel: "PAN",
    factCodeLabel: "ಕೋಡ್ ಸಂಖ್ಯೆ",
    factRefundLabel: "ಮರುಪಾವತಿ ಮೊತ್ತ",
    meaningTitle: "ಇದರಿಂದ ಸಾಮಾನ್ಯವಾಗಿ ಅರ್ಥವೇನು",
    datasetFreshnessLabel: "ಡೇಟಾಸೆಟ್ ತಾಜಾತನ:",
    emptyState: "ಇತ್ತೀಚಿನ ಪ್ರಕಟಿತ ಮರುಪಾವತಿ ದಾಖಲೆ ಪಡೆಯಲು PAN ಮತ್ತು ಮೌಲ್ಯಮಾಪನ ವರ್ಷವನ್ನು ನಮೂದಿಸಿ.",
    awaitingLookup: "ಹುಡುಕಾಟಕ್ಕಾಗಿ ಕಾಯುತ್ತಿದೆ",
    noDatasetYet: "ಡೇಟಾಸೆಟ್ ಇನ್ನೂ ಇಲ್ಲ",
    metadataUnavailable: "ಮೆಟಾಡೇಟಾ ಲಭ್ಯವಿಲ್ಲ",
    latestUploadPrefix: "ಇತ್ತೀಚಿನ ಅಪ್‌ಲೋಡ್:",
    metadataMissing: "ಇನ್ನೂ ಯಾವುದೇ ಕಚೇರಿ ಅಪ್‌ಲೋಡ್ ಮೆಟಾಡೇಟಾ ಪ್ರಕಟವಾಗಿಲ್ಲ.",
    metadataTemplate: (uploadedLabel, uploadedBy, recordCount) => `ಇತ್ತೀಚಿನ ಅಪ್‌ಲೋಡ್: ${uploadedLabel}. ಅಪ್‌ಲೋಡ್ ಮಾಡಿದವರು ${uploadedBy}. ಪ್ರಕಟಿತ ದಾಖಲೆಗಳು: ${recordCount}.`,
    metadataError: (message) => `ಡೇಟಾಸೆಟ್ ಮೆಟಾಡೇಟಾವನ್ನು ಓದಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ: ${message}`,
    lookupLoading: "ಇತ್ತೀಚಿನ ಕಚೇರಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ದಾಖಲೆಯನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...",
    lookupSuccess: "ಇತ್ತೀಚಿನ ದಾಖಲೆಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಪಡೆಯಲಾಗಿದೆ.",
    lookupNotFound: "ಈ PAN ಮತ್ತು ಮೌಲ್ಯಮಾಪನ ವರ್ಷಕ್ಕೆ ಯಾವುದೇ ದಾಖಲೆ ಸಿಗಲಿಲ್ಲ.",
    invalidPan: "ABCDE1234F ಮಾದರಿಯಲ್ಲಿ ಮಾನ್ಯವಾದ PAN ನಮೂದಿಸಿ.",
    selectAy: "ಮೌಲ್ಯಮಾಪನ ವರ್ಷ ಆಯ್ಕೆಮಾಡಿ.",
    lookupFailed: (message) => `ಹುಡುಕಾಟ ವಿಫಲವಾಗಿದೆ: ${message}`,
    notAvailable: "ಲಭ್ಯವಿಲ್ಲ",
    statusPending: "ಸ್ಥಿತಿ ನವೀಕರಣ ಬಾಕಿಯಿದೆ",
    portalInsight: "ಪೋರ್ಟಲ್ ಸೂಚನೆ",
    uploadByFallback: "ಕಚೇರಿ ಸಿಬ್ಬಂದಿ"
  },
  te: {
    pageTitle: "మీ రిఫండ్‌ను ట్రాక్ చేయండి",
    pageSubtitle: "కేంద్రీకృత డేటాసెట్ నుండి తాజా కార్యాలయ స్థితిని పొందడానికి PAN మరియు అసెస్‌మెంట్ ఇయర్ నమోదు చేయండి.",
    backendChip: "రియల్ టైమ్‌లో నవీకరించబడింది",
    languageTitle: "భాషను ఎంచుకోండి",
    languageSubtitle: "క్లయింట్ పోర్టల్‌ను English, Kannada, Telugu, Hindi భాషల మధ్య మార్చండి.",
    panLabel: "PAN",
    assessmentYearLabel: "అసెస్‌మెంట్ ఇయర్",
    assessmentYearPlaceholder: "అసెస్‌మెంట్ ఇయర్ ఎంచుకోండి",
    checkStatusBtn: "స్థితి చూడండి",
    sampleFillBtn: "నమూనా PAN ఉపయోగించండి",
    workflowTitle: "ఇది ఎలా పనిచేస్తుంది:",
    workflowItem1: "ఆఫీస్ సిబ్బంది సురక్షిత ఆఫీస్ పేజీలో తాజా Excel ఫైల్ అప్లోడ్ చేస్తారు.",
    workflowItem2: "వర్క్‌బుక్‌ను పార్స్ చేసి దాని వరుసలను Firebase Firestore లో ప్రచురిస్తారు.",
    workflowItem3: "ఈ క్లయింట్ పేజీ PAN మరియు అసెస్‌మెంట్ ఇయర్ ఆధారంగా తాజా రికార్డును పొందుతుంది.",
    summaryTitle: "స్థితి సారాంశం",
    summarySubtitle: "అప్లోడ్ చేసిన ఆఫీస్ డేటాసెట్ ఆధారంగా రూపొందించిన సులభమైన వివరణ.",
    recordLabel: "రిఫండ్ రికార్డ్",
    factNameLabel: "క్లయింట్ పేరు",
    factPanLabel: "PAN",
    factCodeLabel: "కోడ్ నెం.",
    factRefundLabel: "రిఫండ్ మొత్తం",
    meaningTitle: "ఇది సాధారణంగా ఏమి సూచిస్తుంది",
    datasetFreshnessLabel: "డేటాసెట్ తాజాదనం:",
    emptyState: "తాజా ప్రచురిత రిఫండ్ రికార్డ్ కోసం PAN మరియు అసెస్‌మెంట్ ఇయర్ నమోదు చేయండి.",
    awaitingLookup: "లుకప్ కోసం వేచి ఉంది",
    noDatasetYet: "ఇంకా డేటాసెట్ లేదు",
    metadataUnavailable: "మెటాడేటా అందుబాటులో లేదు",
    latestUploadPrefix: "తాజా అప్లోడ్:",
    metadataMissing: "ఇంకా కార్యాలయ అప్లోడ్ మెటాడేటా ప్రచురించబడలేదు.",
    metadataTemplate: (uploadedLabel, uploadedBy, recordCount) => `తాజా అప్లోడ్: ${uploadedLabel}. అప్లోడ్ చేసినది ${uploadedBy}. ప్రచురిత రికార్డులు: ${recordCount}.`,
    metadataError: (message) => `డేటాసెట్ మెటాడేటా చదవలేకపోయాం: ${message}`,
    lookupLoading: "తాజా కార్యాలయ రికార్డ్‌ను పరిశీలిస్తున్నాం...",
    lookupSuccess: "తాజా రికార్డ్ విజయవంతంగా పొందబడింది.",
    lookupNotFound: "ఈ PAN మరియు అసెస్‌మెంట్ ఇయర్‌కు రికార్డ్ దొరకలేదు.",
    invalidPan: "ABCDE1234F ఫార్మాట్‌లో సరైన PAN నమోదు చేయండి.",
    selectAy: "అసెస్‌మెంట్ ఇయర్ ఎంచుకోండి.",
    lookupFailed: (message) => `లుకప్ విఫలమైంది: ${message}`,
    notAvailable: "అందుబాటులో లేదు",
    statusPending: "స్థితి నవీకరణ కోసం వేచి ఉంది",
    portalInsight: "పోర్టల్ సూచన",
    uploadByFallback: "ఆఫీస్ సిబ్బంది"
  },
  hi: {
    pageTitle: "अपना रिफंड ट्रैक करें",
    pageSubtitle: "केंद्रीय डाटासेट से नवीनतम कार्यालय-अपलोड की गई स्थिति पाने के लिए PAN और असेसमेंट ईयर दर्ज करें।",
    backendChip: "रियल टाइम में अपडेट किया गया",
    languageTitle: "भाषा चुनें",
    languageSubtitle: "क्लाइंट पोर्टल को English, Kannada, Telugu और Hindi में बदलें।",
    panLabel: "PAN",
    assessmentYearLabel: "असेसमेंट ईयर",
    assessmentYearPlaceholder: "असेसमेंट ईयर चुनें",
    checkStatusBtn: "स्थिति देखें",
    sampleFillBtn: "नमूना PAN उपयोग करें",
    workflowTitle: "यह कैसे काम करता है:",
    workflowItem1: "ऑफिस स्टाफ सुरक्षित ऑफिस पेज पर नवीनतम Excel अपलोड करता है।",
    workflowItem2: "वर्कबुक को पार्स करके उसकी पंक्तियाँ Firebase Firestore में प्रकाशित की जाती हैं।",
    workflowItem3: "यह क्लाइंट पेज PAN और असेसमेंट ईयर के आधार पर नवीनतम केंद्रीकृत रिकॉर्ड प्राप्त करता है।",
    summaryTitle: "स्थिति सारांश",
    summarySubtitle: "अपलोड किए गए कार्यालय डाटासेट पर आधारित सरल और उपयोगी विवरण।",
    recordLabel: "रिफंड रिकॉर्ड",
    factNameLabel: "क्लाइंट नाम",
    factPanLabel: "PAN",
    factCodeLabel: "कोड नंबर",
    factRefundLabel: "रिफंड राशि",
    meaningTitle: "आमतौर पर इसका क्या मतलब होता है",
    datasetFreshnessLabel: "डाटासेट ताजगी:",
    emptyState: "नवीनतम प्रकाशित रिफंड रिकॉर्ड पाने के लिए PAN और असेसमेंट ईयर दर्ज करें।",
    awaitingLookup: "लुकअप की प्रतीक्षा में",
    noDatasetYet: "अभी कोई डाटासेट नहीं",
    metadataUnavailable: "मेटाडेटा उपलब्ध नहीं",
    latestUploadPrefix: "नवीनतम अपलोड:",
    metadataMissing: "अभी तक कोई ऑफिस-अपलोड मेटाडेटा प्रकाशित नहीं हुआ है।",
    metadataTemplate: (uploadedLabel, uploadedBy, recordCount) => `नवीनतम अपलोड: ${uploadedLabel}. अपलोड किया: ${uploadedBy}. प्रकाशित रिकॉर्ड: ${recordCount}.`,
    metadataError: (message) => `डाटासेट मेटाडेटा पढ़ा नहीं जा सका: ${message}`,
    lookupLoading: "नवीनतम कार्यालय रिकॉर्ड जाँचा जा रहा है...",
    lookupSuccess: "नवीनतम रिकॉर्ड सफलतापूर्वक प्राप्त हुआ।",
    lookupNotFound: "इस PAN और असेसमेंट ईयर के लिए कोई रिकॉर्ड नहीं मिला।",
    invalidPan: "ABCDE1234F प्रारूप में मान्य PAN दर्ज करें।",
    selectAy: "असेसमेंट ईयर चुनें।",
    lookupFailed: (message) => `लुकअप विफल रहा: ${message}`,
    notAvailable: "उपलब्ध नहीं",
    statusPending: "स्थिति अपडेट लंबित है",
    portalInsight: "पोर्टल संकेत",
    uploadByFallback: "ऑफिस स्टाफ"
  }
};

let currentLanguage = "en";
let lastRecord = null;
let datasetMetaCache = null;

const statusViews = {
  "successfully e-verified": {
    badgeClass: "completed",
    labels: {
      en: "Successfully e-verified",
      kn: "ಯಶಸ್ವಿಯಾಗಿ ಇ-ವೆರಿಫೈ ಮಾಡಲಾಗಿದೆ",
      te: "విజయవంతంగా e-verify చేయబడింది",
      hi: "सफलतापूर्वक ई-वेरिफाई किया गया"
    },
    summary: {
      en: (name, ay, amount) => `${name}'s return for AY ${ay} is marked as successfully e-verified. This means the verification step has been completed and the return is in or ready for further processing. The refund amount currently reflected in the office record is ${amount}.`,
      kn: (name, ay, amount) => `${name} ಅವರ AY ${ay} ರಿಟರ್ನ್ ಯಶಸ್ವಿಯಾಗಿ ಇ-ವೆರಿಫೈ ಆಗಿದೆ. ಇದರಿಂದ ಪರಿಶೀಲನಾ ಹಂತ ಪೂರ್ಣಗೊಂಡಿದ್ದು ಮುಂದಿನ ಪ್ರಕ್ರಿಯೆಗೆ ರಿಟರ್ನ್ ಸಿದ್ಧವಾಗಿದೆ. ಕಚೇರಿ ದಾಖಲೆಯಲ್ಲಿ ಪ್ರಸ್ತುತ ತೋರಿಸಿರುವ ಮರುಪಾವತಿ ಮೊತ್ತ ${amount}.`,
      te: (name, ay, amount) => `${name} గారి AY ${ay} రిటర్న్ విజయవంతంగా e-verify చేయబడింది. అంటే వెరిఫికేషన్ దశ పూర్తయ్యింది మరియు రిటర్న్ తదుపరి ప్రాసెసింగ్‌కు సిద్ధంగా ఉంది. ఆఫీస్ రికార్డులో ప్రస్తుతం కనిపిస్తున్న రిఫండ్ మొత్తం ${amount}.`,
      hi: (name, ay, amount) => `${name} का AY ${ay} रिटर्न सफलतापूर्वक ई-वेरिफाई दिखाया गया है। इसका अर्थ है कि सत्यापन चरण पूरा हो चुका है और रिटर्न आगे की प्रोसेसिंग में है या उसके लिए तैयार है। कार्यालय रिकॉर्ड में दिखाई गई वर्तमान रिफंड राशि ${amount} है।`
    },
    timeline: {
      en: [
        "The return has crossed the verification milestone successfully.",
        "Processing normally continues after the verification stage.",
        "You can keep monitoring future movement in the official portal or office updates."
      ],
      kn: [
        "ರಿಟರ್ನ್ ಪರಿಶೀಲನಾ ಹಂತವನ್ನು ಯಶಸ್ವಿಯಾಗಿ ದಾಟಿದೆ.",
        "ವೆರಿಫಿಕೇಶನ್ ನಂತರ ಪ್ರಕ್ರಿಯೆ ಸಾಮಾನ್ಯವಾಗಿ ಮುಂದುವರಿಯುತ್ತದೆ.",
        "ಮುಂದಿನ ಬದಲಾವಣೆಗಳನ್ನು ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಅಥವಾ ಕಚೇರಿ ನವೀಕರಣಗಳಲ್ಲಿ ನೋಡಬಹುದು."
      ],
      te: [
        "రిటర్న్ వెరిఫికేషన్ దశను విజయవంతంగా పూర్తి చేసింది.",
        "వెరిఫికేషన్ తర్వాత ప్రాసెసింగ్ సాధారణంగా కొనసాగుతుంది.",
        "తదుపరి మార్పులను అధికారిక పోర్టల్ లేదా ఆఫీస్ అప్డేట్స్‌లో చూడవచ్చు."
      ],
      hi: [
        "रिटर्न ने सत्यापन चरण सफलतापूर्वक पूरा कर लिया है।",
        "वेरिफिकेशन के बाद प्रोसेसिंग सामान्य रूप से आगे बढ़ती है।",
        "आगे की प्रगति आधिकारिक पोर्टल या ऑफिस अपडेट्स में देखी जा सकती है।"
      ]
    }
  },
  "processed with refund due": {
    badgeClass: "completed",
    labels: {
      en: "Processed with refund due",
      kn: "ಮರುಪಾವತಿ ಬಾಕಿಯೊಂದಿಗೆ ಪ್ರಕ್ರಿಯೆಗೊಂಡಿದೆ",
      te: "రిఫండ్ రావాల్సి ఉండగా ప్రాసెస్ అయింది",
      hi: "रिफंड देय के साथ प्रोसेस्ड"
    },
    summary: {
      en: (name, ay, amount) => `${name}'s return for AY ${ay} is recorded as processed with refund due. The department has likely completed the core processing stage and the refund outcome is reflected in the office record. The refund amount shown is ${amount}.`,
      kn: (name, ay, amount) => `${name} ಅವರ AY ${ay} ರಿಟರ್ನ್ ಮರುಪಾವತಿ ಬಾಕಿಯೊಂದಿಗೆ ಪ್ರಕ್ರಿಯೆಯಾಗಿದೆ ಎಂದು ದಾಖಲಾಗಿದೆ. ಮುಖ್ಯ ಪ್ರಕ್ರಿಯೆ ಪೂರ್ಣಗೊಂಡಿರುವ ಸಾಧ್ಯತೆ ಇದೆ ಮತ್ತು ಅದರ ಫಲಿತಾಂಶ ಕಚೇರಿ ದಾಖಲೆಯಲ್ಲಿ ತೋರಿಸುತ್ತದೆ. ತೋರಿಸಿರುವ ಮರುಪಾವತಿ ಮೊತ್ತ ${amount}.`,
      te: (name, ay, amount) => `${name} గారి AY ${ay} రిటర్న్ రిఫండ్ రావాల్సి ఉండగా ప్రాసెస్ అయినట్లు నమోదైంది. ప్రధాన ప్రాసెసింగ్ పూర్తయి రిఫండ్ ఫలితం ఆఫీస్ రికార్డులో ప్రతిబింబిస్తోంది. చూపుతున్న రిఫండ్ మొత్తం ${amount}.`,
      hi: (name, ay, amount) => `${name} के AY ${ay} रिटर्न को रिफंड देय के साथ प्रोसेस्ड के रूप में दर्ज किया गया है। विभाग ने संभवतः मुख्य प्रोसेसिंग पूरी कर ली है और उसका परिणाम कार्यालय रिकॉर्ड में दिखाई दे रहा है। दिखाई गई रिफंड राशि ${amount} है।`
    },
    timeline: {
      en: [
        "The return has moved beyond review and reflects a refund outcome.",
        "The next visible movement is generally release or credit-related processing.",
        "Bank-account-linked final settlement timing can still vary."
      ],
      kn: [
        "ರಿಟರ್ನ್ ವಿಮರ್ಶಾ ಹಂತವನ್ನು ದಾಟಿ ಮರುಪಾವತಿ ಫಲಿತಾಂಶ ತೋರಿಸುತ್ತದೆ.",
        "ಮುಂದಿನ ಹಂತ ಸಾಮಾನ್ಯವಾಗಿ ಬಿಡುಗಡೆ ಅಥವಾ ಕ್ರೆಡಿಟ್ ಪ್ರಕ್ರಿಯೆಗೆ ಸಂಬಂಧಿಸಿದೆ.",
        "ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಜಮಾ ಆಗುವ ಅಂತಿಮ ಸಮಯ ಬದಲಾಗಬಹುದು."
      ],
      te: [
        "రిటర్న్ సమీక్ష దశను దాటి రిఫండ్ ఫలితాన్ని చూపిస్తోంది.",
        "తదుపరి దశ సాధారణంగా విడుదల లేదా క్రెడిట్ ప్రాసెసింగ్‌కు సంబంధించినది.",
        "బ్యాంక్ ఖాతాలో తుది జమ సమయం మారవచ్చు."
      ],
      hi: [
        "रिटर्न समीक्षा चरण से आगे बढ़ चुका है और रिफंड परिणाम दिखा रहा है।",
        "अगला चरण सामान्यतः रिलीज या क्रेडिट से संबंधित प्रोसेसिंग होता है।",
        "बैंक खाते में अंतिम जमा होने का समय अलग-अलग हो सकता है।"
      ]
    }
  },
  "refund kept on hold": {
    badgeClass: "hold",
    labels: {
      en: "Refund kept on hold",
      kn: "ಮರುಪಾವತಿ ಹೋಲ್ಡ್‌ನಲ್ಲಿ ಇಡಲಾಗಿದೆ",
      te: "రిఫండ్ హోల్డ్‌లో ఉంచబడింది",
      hi: "रिफंड होल्ड पर रखा गया"
    },
    summary: {
      en: (name, ay, amount) => `${name}'s return for AY ${ay} shows that the refund is currently kept on hold. This usually means the refund release is paused pending a verification, response, or internal adjustment step. The office record currently shows a refund amount of ${amount}.`,
      kn: (name, ay, amount) => `${name} ಅವರ AY ${ay} ರಿಟರ್ನ್‌ನಲ್ಲಿ ಮರುಪಾವತಿ ಪ್ರಸ್ತುತ ಹೋಲ್ಡ್‌ನಲ್ಲಿ ಇದೆ ಎಂದು ತೋರಿಸುತ್ತದೆ. ಇದು ಸಾಮಾನ್ಯವಾಗಿ ಪರಿಶೀಲನೆ, ಪ್ರತಿಕ್ರಿಯೆ ಅಥವಾ ಆಂತರಿಕ ಸರಿಹೊಂದಿಸುವ ಹಂತ ಬಾಕಿಯಿದೆ ಎಂಬುದನ್ನು ಸೂಚಿಸುತ್ತದೆ. ಕಚೇರಿ ದಾಖಲೆಯಲ್ಲಿ ಮರುಪಾವತಿ ಮೊತ್ತ ${amount} ಎಂದು ತೋರಿಸುತ್ತದೆ.`,
      te: (name, ay, amount) => `${name} గారి AY ${ay} రిటర్న్‌లో రిఫండ్ ప్రస్తుతం హోల్డ్‌లో ఉందని చూపిస్తోంది. అంటే వెరిఫికేషన్, స్పందన లేదా అంతర్గత సవరణ కారణంగా విడుదల తాత్కాలికంగా ఆగి ఉండొచ్చు. ఆఫీస్ రికార్డులో రిఫండ్ మొత్తం ${amount}గా ఉంది.`,
      hi: (name, ay, amount) => `${name} के AY ${ay} रिटर्न में रिफंड वर्तमान में होल्ड पर दिख रहा है। इसका अर्थ सामान्यतः यह होता है कि सत्यापन, उत्तर या आंतरिक समायोजन के कारण रिफंड रिलीज रुकी हुई है। कार्यालय रिकॉर्ड में रिफंड राशि ${amount} दिखाई गई है।`
    },
    timeline: {
      en: [
        "A hold is reflected against the refund outcome for this assessment year.",
        "This can happen because of review, demand adjustment, or pending clarification.",
        "The status may change after the relevant requirement is resolved."
      ],
      kn: [
        "ಈ ಮೌಲ್ಯಮಾಪನ ವರ್ಷದ ಮರುಪಾವತಿ ಫಲಿತಾಂಶದ ಮೇಲೆ ಹೋಲ್ಡ್ ತೋರಿಸುತ್ತದೆ.",
        "ಇದು ವಿಮರ್ಶೆ, ಬೇಡಿಕೆ ಸರಿಹೊಂದಿಕೆ ಅಥವಾ ಬಾಕಿ ವಿವರಣೆಯಿಂದ ಆಗಿರಬಹುದು.",
        "ಸಂಬಂಧಿತ ಅಗತ್ಯ ಪೂರ್ಣಗೊಂಡ ನಂತರ ಸ್ಥಿತಿ ಬದಲಾಗಬಹುದು."
      ],
      te: [
        "ఈ అసెస్‌మెంట్ ఇయర్ రిఫండ్ ఫలితంపై హోల్డ్ చూపిస్తోంది.",
        "ఇది సమీక్ష, డిమాండ్ అడ్జస్ట్మెంట్ లేదా పెండింగ్ వివరణ వల్ల కావచ్చు.",
        "సంబంధిత అవసరం పూర్తి అయిన తర్వాత స్థితి మారవచ్చు."
      ],
      hi: [
        "इस असेसमेंट ईयर के रिफंड परिणाम पर होल्ड दिख रहा है।",
        "यह समीक्षा, डिमांड एडजस्टमेंट या लंबित स्पष्टीकरण के कारण हो सकता है।",
        "संबंधित आवश्यकता पूरी होने के बाद स्थिति बदल सकती है।"
      ]
    }
  },
  "": {
    badgeClass: "unknown",
    labels: {
      en: "Status pending update",
      kn: "ಸ್ಥಿತಿ ನವೀಕರಣ ಬಾಕಿಯಿದೆ",
      te: "స్థితి నవీకరణ పెండింగ్‌లో ఉంది",
      hi: "स्थिति अपडेट लंबित है"
    },
    summary: {
      en: (name, ay, amount) => `${name}'s record for AY ${ay} is available, but the refund status has not yet been filled in the uploaded office sheet. The office record currently reflects a refund amount of ${amount}.`,
      kn: (name, ay, amount) => `${name} ಅವರ AY ${ay} ದಾಖಲೆಯು ಲಭ್ಯವಿದೆ, ಆದರೆ ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ಕಚೇರಿ ಶೀಟ್‌ನಲ್ಲಿ ಮರುಪಾವತಿ ಸ್ಥಿತಿ ಇನ್ನೂ ತುಂಬಲಾಗಿಲ್ಲ. ಕಚೇರಿ ದಾಖಲೆಯಲ್ಲಿ ಪ್ರಸ್ತುತ ಮರುಪಾವತಿ ಮೊತ್ತ ${amount} ಎಂದು ತೋರಿಸುತ್ತದೆ.`,
      te: (name, ay, amount) => `${name} గారి AY ${ay} రికార్డ్ అందుబాటులో ఉంది, కానీ అప్లోడ్ చేసిన ఆఫీస్ షీట్‌లో రిఫండ్ స్థితి ఇంకా నింపబడలేదు. ఆఫీస్ రికార్డులో ప్రస్తుతం రిఫండ్ మొత్తం ${amount}గా ఉంది.`,
      hi: (name, ay, amount) => `${name} का AY ${ay} रिकॉर्ड उपलब्ध है, लेकिन अपलोड की गई ऑफिस शीट में रिफंड स्थिति अभी भरी नहीं गई है। कार्यालय रिकॉर्ड में वर्तमान रिफंड राशि ${amount} दिखाई गई है।`
    },
    timeline: {
      en: [
        "The row exists in the office dataset for this client and assessment year.",
        "The refund amount is present, but the refund-status field is blank.",
        "Please wait for the office to publish the next workbook update."
      ],
      kn: [
        "ಈ ಗ್ರಾಹಕ ಮತ್ತು ಮೌಲ್ಯಮಾಪನ ವರ್ಷದ ದಾಖಲೆ ಕಚೇರಿ ಡೇಟಾಸೆಟ್‌ನಲ್ಲಿ ಇದೆ.",
        "ಮರುಪಾವತಿ ಮೊತ್ತ ಇದೆ, ಆದರೆ ಸ್ಥಿತಿ ಫೀಲ್ಡ್ ಖಾಲಿಯಾಗಿದೆ.",
        "ಮುಂದಿನ ವರ್ಕ್‌ಬುಕ್ ನವೀಕರಣಕ್ಕಾಗಿ ಕಚೇರಿಯಿಂದ ಕಾಯಿರಿ."
      ],
      te: [
        "ఈ క్లయింట్ మరియు అసెస్‌మెంట్ ఇయర్‌కు సంబంధించిన రికార్డ్ ఆఫీస్ డేటాసెట్‌లో ఉంది.",
        "రిఫండ్ మొత్తం ఉంది కానీ స్టేటస్ ఫీల్డ్ ఖాళీగా ఉంది.",
        "తదుపరి వర్క్‌బుక్ అప్డేట్ కోసం కార్యాలయాన్ని వేచి చూడండి."
      ],
      hi: [
        "इस क्लाइंट और असेसमेंट ईयर के लिए रिकॉर्ड ऑफिस डाटासेट में मौजूद है।",
        "रिफंड राशि मौजूद है, लेकिन स्टेटस फ़ील्ड खाली है।",
        "अगले वर्कबुक अपडेट के लिए कार्यालय से प्रतीक्षा करें।"
      ]
    }
  }
};

function t() {
  return uiText[currentLanguage] || uiText.en;
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return t().notAvailable;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(amount));
}

function panLooksValid(value) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value);
}

function buildTimeline(items) {
  timeline.innerHTML = "";
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "timeline-row";

    const dot = document.createElement("div");
    dot.className = "timeline-dot";

    const copy = document.createElement("div");
    copy.className = "timeline-copy";
    copy.innerHTML = `<strong>${t().portalInsight}</strong>${item}`;

    row.appendChild(dot);
    row.appendChild(copy);
    timeline.appendChild(row);
  });
}

function getStatusView(statusValue) {
  const normalized = (statusValue || "").trim().toLowerCase();
  const base = statusViews[normalized] || {
    badgeClass: "unknown",
    labels: {
      en: statusValue || uiText.en.statusPending,
      kn: statusValue || uiText.kn.statusPending,
      te: statusValue || uiText.te.statusPending,
      hi: statusValue || uiText.hi.statusPending
    },
    summary: {
      en: (name, ay, amount) => `${name}'s return for AY ${ay} is currently shown as "${statusValue}". The uploaded office record reflects a refund amount of ${amount}.`,
      kn: (name, ay, amount) => `${name} ಅವರ AY ${ay} ರಿಟರ್ನ್ ಪ್ರಸ್ತುತ "${statusValue}" ಎಂದು ತೋರಿಸುತ್ತದೆ. ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ಕಚೇರಿ ದಾಖಲೆಯಲ್ಲಿ ಮರುಪಾವತಿ ಮೊತ್ತ ${amount} ಎಂದು ತೋರಿಸುತ್ತದೆ.`,
      te: (name, ay, amount) => `${name} గారి AY ${ay} రిటర్న్ ప్రస్తుతం "${statusValue}" గా చూపిస్తోంది. అప్లోడ్ చేసిన ఆఫీస్ రికార్డులో రిఫండ్ మొత్తం ${amount}గా ఉంది.`,
      hi: (name, ay, amount) => `${name} का AY ${ay} रिटर्न वर्तमान में "${statusValue}" के रूप में दिख रहा है। अपलोड किए गए कार्यालय रिकॉर्ड में रिफंड राशि ${amount} दिखाई दे रही है।`
    },
    timeline: {
      en: [
        "The status is being shown exactly as it appears in the uploaded office workbook.",
        "If needed, the office can publish a more specific workbook update later.",
        "Use the official portal for the most authoritative live tax-portal status."
      ],
      kn: [
        "ಸ್ಥಿತಿಯನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ಕಚೇರಿ ವರ್ಕ್‌ಬುಕ್‌ನಂತೆ ತೋರಿಸಲಾಗುತ್ತಿದೆ.",
        "ಅಗತ್ಯವಿದ್ದರೆ ಕಚೇರಿ ನಂತರ ಇನ್ನಷ್ಟು ಸ್ಪಷ್ಟ ನವೀಕರಣ ಪ್ರಕಟಿಸಬಹುದು.",
        "ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿರುವ ಸ್ಥಿತಿ ಅತ್ಯಂತ ಪ್ರಾಮಾಣಿಕವಾದುದು."
      ],
      te: [
        "అప్లోడ్ చేసిన ఆఫీస్ వర్క్‌బుక్‌లో ఉన్నట్టుగానే స్థితిని చూపిస్తున్నాం.",
        "అవసరమైతే కార్యాలయం తరువాత మరింత స్పష్టమైన అప్డేట్ ఇవ్వవచ్చు.",
        "అత్యంత ప్రామాణిక స్థితి కోసం అధికారిక పోర్టల్‌ను చూడండి."
      ],
      hi: [
        "स्थिति ठीक उसी रूप में दिखाई जा रही है जैसी अपलोड की गई ऑफिस वर्कबुक में है।",
        "आवश्यक होने पर कार्यालय बाद में अधिक स्पष्ट अपडेट प्रकाशित कर सकता है।",
        "सबसे प्रामाणिक स्थिति के लिए आधिकारिक पोर्टल देखें।"
      ]
    }
  };

  return {
    label: base.labels[currentLanguage] || base.labels.en,
    badgeClass: base.badgeClass,
    summary: base.summary[currentLanguage] || base.summary.en,
    timeline: base.timeline[currentLanguage] || base.timeline.en
  };
}

function renderRecord(record) {
  const amount = formatCurrency(record.refundAmount);
  const view = getStatusView(record.refundStatus);

  resultTitle.textContent = `AY ${record.assessmentYear}`;
  resultBadge.textContent = view.label;
  resultBadge.className = `badge ${view.badgeClass}`;
  resultSummary.textContent = view.summary(record.name, record.assessmentYear, amount);
  factName.textContent = record.name || "-";
  factPan.textContent = record.pan || "-";
  factCode.textContent = record.codeNo || "-";
  factRefund.textContent = amount;

  buildTimeline(view.timeline);
  emptyState.style.display = "none";
  resultCard.classList.add("active");
}

function applyTranslations() {
  const copy = t();
  const ids = [
    "pageTitle", "pageSubtitle", "backendChip", "languageTitle", "languageSubtitle",
    "panLabel", "assessmentYearLabel", "checkStatusBtn", "sampleFillBtn",
    "workflowTitle", "workflowItem1", "workflowItem2", "workflowItem3",
    "summaryTitle", "summarySubtitle", "recordLabel", "factNameLabel",
    "factPanLabel", "factCodeLabel", "factRefundLabel", "meaningTitle",
    "datasetFreshnessLabel", "emptyState"
  ];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el && copy[id]) {
      el.textContent = copy[id];
    }
  });

  document.getElementById("assessmentYearPlaceholder").textContent = copy.assessmentYearPlaceholder;
  dataSourceChip.textContent = copy.awaitingLookup;

  document.querySelectorAll(".language-btn").forEach((button) => {
    button.classList.toggle("btn-primary", button.dataset.lang === currentLanguage);
    button.classList.toggle("btn-ghost", button.dataset.lang !== currentLanguage);
  });

  if (!resultCard.classList.contains("active")) {
    emptyState.textContent = copy.emptyState;
  }

  if (lastRecord) {
    renderRecord(lastRecord);
  }

  if (datasetMetaCache) {
    renderDatasetMeta(datasetMetaCache);
  }
}

function renderDatasetMeta(meta) {
  datasetMetaCache = meta;
  const copy = t();

  if (!meta) {
    datasetMetaText.textContent = copy.metadataMissing;
    dataSourceChip.textContent = copy.noDatasetYet;
    return;
  }

  const uploadedAt = meta.uploadedAt?.toDate ? meta.uploadedAt.toDate() : null;
  const uploadedLabel = uploadedAt ? uploadedAt.toLocaleString("en-IN") : "unknown time";
  datasetMetaText.textContent = copy.metadataTemplate(
    uploadedLabel,
    meta.uploadedBy || copy.uploadByFallback,
    meta.recordCount || 0
  );
  dataSourceChip.textContent = `${copy.latestUploadPrefix} ${meta.assessmentYear || "-"}`;
}

async function loadDatasetMeta() {
  try {
    const snap = await getDoc(doc(db, FIRESTORE_METADATA_DOC));
    if (!snap.exists()) {
      renderDatasetMeta(null);
      return;
    }

    renderDatasetMeta(snap.data());
  } catch (error) {
    datasetMetaText.textContent = t().metadataError(error.message);
    dataSourceChip.textContent = t().metadataUnavailable;
  }
}

async function lookupRecord(pan, assessmentYear) {
  const recordsRef = collection(db, FIRESTORE_COLLECTION);
  const q = query(
    recordsRef,
    where("pan", "==", pan),
    where("assessmentYear", "==", assessmentYear),
    limit(1)
  );

  const snap = await getDocs(q);
  if (snap.empty) {
    return null;
  }
  return snap.docs[0].data();
}

lookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const pan = document.getElementById("pan").value.trim().toUpperCase();
  const assessmentYear = document.getElementById("assessmentYear").value;

  lookupMessage.className = "status-message error";
  resultCard.classList.remove("active");
  emptyState.style.display = "block";

  if (!panLooksValid(pan)) {
    lookupMessage.textContent = t().invalidPan;
    return;
  }

  if (!assessmentYear) {
    lookupMessage.textContent = t().selectAy;
    return;
  }

  lookupMessage.className = "status-message warning";
  lookupMessage.textContent = t().lookupLoading;

  try {
    const record = await lookupRecord(pan, assessmentYear);
    if (!record) {
      lookupMessage.className = "status-message error";
      lookupMessage.textContent = t().lookupNotFound;
      return;
    }

    lastRecord = record;
    renderRecord(record);
    lookupMessage.className = "status-message success";
    lookupMessage.textContent = t().lookupSuccess;
  } catch (error) {
    lookupMessage.className = "status-message error";
    lookupMessage.textContent = t().lookupFailed(error.message);
  }
});

document.getElementById("sampleFillBtn").addEventListener("click", () => {
  document.getElementById("pan").value = "AFYPB8217M";
  document.getElementById("assessmentYear").value = "2025-26";
});

document.querySelectorAll(".language-btn").forEach((button) => {
  button.addEventListener("click", () => {
    currentLanguage = button.dataset.lang;
    applyTranslations();
  });
});

applyTranslations();
loadDatasetMeta();
