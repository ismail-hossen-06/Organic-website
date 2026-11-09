/* ============================================================
   SmoothLife — script.js (v2)
   ✏️ দাম, ফোন নাম্বার ও Google Sheet URL নিচের CONFIG-এ বদলান
   ✅ নতুন: অর্ডার শিটে পৌঁছালে তবেই "সফল" দেখায়,
      না পৌঁছালে আসল কারণসহ এরর দেখায়
   ============================================================ */
const CONFIG = {
  // 👇 Google Apps Script থেকে পাওয়া Web app URL (/exec দিয়ে শেষ হবে)
  //    খালি রাখলে "ডেমো মোডে" চলবে — অর্ডার শিটে যাবে না।
  SHEET_URL: "https://script.google.com/macros/s/AKfycbwiN7FWaCJvnYQgNSORZWqJ4GxrW7SLRjTyvVivP3QfDJaNzRKlk6GNmKst-rxBEq6P/exec",

  PRODUCT_NAME: "SmoothLife Protein Calcium Plus",
  REGULAR_PRICE: 1450,
  PRICE: 990,
  DELIVERY_CHARGE: 80,
  CONTACT_PHONE: "01700000000",
};

/* ---------- হেল্পার ---------- */
const $ = (id) => document.getElementById(id);
const toBn = (v) => String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
const toEn = (v) => String(v).replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));

document.addEventListener("DOMContentLoaded", init);

function init() {
  const total = CONFIG.PRICE + CONFIG.DELIVERY_CHARGE;

  // দাম ও ফোন অটো বসানো
  $("regularPrice").textContent = toBn(CONFIG.REGULAR_PRICE);
  $("dealPrice").textContent = toBn(CONFIG.PRICE);
  $("sumSubtotal").textContent = toBn(CONFIG.PRICE) + ".০০";
  $("sumSubtotal2").textContent = toBn(CONFIG.PRICE) + ".০০";
  $("sumDelivery").textContent = toBn(CONFIG.DELIVERY_CHARGE) + ".০০";
  $("sumTotal").textContent = toBn(total.toLocaleString("en-IN")) + ".০০";
  $("stickyPrice").textContent = toBn(CONFIG.PRICE);
  $("year").textContent = toBn(new Date().getFullYear());
  const phoneLink = $("contactPhone");
  phoneLink.textContent = "📞 " + CONFIG.CONTACT_PHONE;
  phoneLink.href = "tel:" + CONFIG.CONTACT_PHONE;

  // রিভিউ কার্ড ডুপ্লিকেট করে অসীম স্ক্রল বানানো
  const track = $("reviewTrack");
  track.innerHTML += track.innerHTML;

  // ফোন ইনপুট: শুধু সংখ্যা, সর্বোচ্চ ১১ ডিজিট (বাংলা সংখ্যাও চলবে)
  const phone = $("custPhone");
  phone.addEventListener("input", () => {
    phone.value = toEn(phone.value).replace(/\D/g, "").slice(0, 11);
    phone.classList.remove("invalid");
  });
  ["custName", "custAddress"].forEach((id) =>
    $(id).addEventListener("input", () => $(id).classList.remove("invalid"))
  );

  // ফর্ম সাবমিট
  $("orderForm").addEventListener("submit", placeOrder);

  // পপ-আপ বন্ধ
  $("modalClose").addEventListener("click", closeModal);
  $("modalOverlay").addEventListener("click", (e) => {
    if (e.target === $("modalOverlay")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // অর্ডার সেকশন দেখা গেলে ভাসমান বাটন লুকানো
  new IntersectionObserver(
    (entries) => $("stickyCta").classList.toggle("hide", entries[0].isIntersecting),
    { threshold: 0.1 }
  ).observe($("order"));

  // স্ক্রল অ্যানিমেশন
  document.body.classList.add("reveal-init");
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("visible"); io.unobserve(en.target); }
    }),
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

/* ---------- পপ-আপ ---------- */
function showModal(icon, title, msg) {
  $("modalIcon").textContent = icon;
  $("modalTitle").textContent = title;
  $("modalMsg").textContent = msg;
  $("modalOverlay").hidden = false;
}
function closeModal() { $("modalOverlay").hidden = true; }

/* ---------- URL যাচাই ---------- */
function sheetUrlError(url) {
  if (url.includes("script.google.com") && url.trim().endsWith("/dev")) {
    return ["❌", "ভুল URL (/dev)",
      "ডিপ্লয় করার পর পাওয়া /exec URL টা SHEET_URL-এ বসান। /dev URL শুধু আপনার নিজের লগইন করা ব্রাউজারে চলে — কাস্টমারদের অর্ডার আসবে না।"];
  }
  return null;
}

/* ---------- শিটে পাঠানো + আসল রেসপন্স যাচাই ----------
   Apps Script "Anyone" মোডে ডিপ্লয় থাকলে CORS উত্তর পড়া যায়,
   তাই এখন সত্যিকারের success/error ধরা পড়ে */
async function sendToSheet(payload) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 25000);
  let res;
  try {
    res = await fetch(CONFIG.SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(to);
  }
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (_) {}
  if (!data) {
    const e = new Error("NON_JSON"); e.code = "NON_JSON"; throw e;
  }
  if (data.result !== "success") {
    const e = new Error("SCRIPT_ERROR"); e.code = "SCRIPT_ERROR"; e.detail = data.message || ""; throw e;
  }
  return data;
}

/* ---------- এররকে সহজ বাংলায় ব্যাখ্যা ---------- */
function explainError(err) {
  if (err && err.code === "SCRIPT_ERROR") {
    const d = err.detail || "";
    if (/SHEET_NOT_FOUND|getActiveSpreadsheet|openById|Cannot read|null/i.test(d)) {
      return ["❌", "Sheet খুঁজে পাচ্ছে না",
        "স্ক্রিপ্টটা সম্ভবত Sheet থেকে খোলা হয়নি। Sheet-এর Extensions → Apps Script থেকে খুলুন, অথবা .gs কোডের SPREADSHEET_ID-তে আপনার Sheet-এর ID বসান। তারপর New version Deploy করুন।"];
    }
    return ["❌", "Apps Script এরর",
      "সার্ভার বলছে: " + d + " — .gs কোডটা ঠিকমতো পেস্ট হয়েছে কিনা দেখুন, তারপর New version Deploy করুন।"];
  }
  if (err && err.code === "NON_JSON") {
    return ["❌", "ভুল রেসপন্স",
      "সম্ভবত URL ভুল, অথবা Deploy করার সময় Who has access: Anyone দেওয়া হয়নি (লগইন পেজ ফেরত আসছে)। README-র চেকলিস্ট মিলিয়ে দেখুন।"];
  }
  if (err && err.name === "AbortError") {
    return ["⏳", "সময় পার হয়ে গেছে",
      "ইন্টারনেট ধীর বা সার্ভার সাড়া দিচ্ছে না। একটু পরে আবার চেষ্টা করুন।"];
  }
  return ["❌", "অর্ডার পাঠানো যায়নি",
    "ইন্টারনেট সংযোগ আছে কিনা, SHEET_URL ঠিক আছে কিনা (/exec), এবং Deploy → Who has access: Anyone দেওয়া আছে কিনা দেখুন। এডিটরের 🔌 শিট টেস্ট বাটনে চাপলে আসল কারণ জানা যাবে।"];
}

/* ---------- অর্ডার সাবমিট ---------- */
async function placeOrder(e) {
  e.preventDefault();

  const name = $("custName").value.trim();
  const address = $("custAddress").value.trim();
  const phone = toEn($("custPhone").value).replace(/\D/g, "");

  // ভ্যালিডেশন
  if (name.length < 2) {
    $("custName").classList.add("invalid"); $("custName").focus();
    return showModal("⚠️", "নাম লিখুন", "অনুগ্রহ করে আপনার সঠিক নামটি লিখুন।");
  }
  if (address.length < 5) {
    $("custAddress").classList.add("invalid"); $("custAddress").focus();
    return showModal("⚠️", "ঠিকানা লিখুন", "ডেলিভারির জন্য আপনার সম্পূর্ণ ঠিকানা লিখুন।");
  }
  if (!/^01[3-9]\d{8}$/.test(phone)) {
    $("custPhone").classList.add("invalid"); $("custPhone").focus();
    return showModal("❌", "অর্ডার করা যাচ্ছে না",
      "আপনার দেওয়া ফোন নাম্বারটি ভুল। দয়া করে আপনার ১১ সংখ্যার সঠিক ফোন নাম্বারটি প্রবেশ করান।");
  }
  if (CONFIG.SHEET_URL) {
    const problem = sheetUrlError(CONFIG.SHEET_URL);
    if (problem) return showModal(problem[0], problem[1], problem[2]);
  }

  const btn = $("submitBtn");
  const oldText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "অর্ডার প্রসেস হচ্ছে…";

  const payload = {
    time: new Date().toISOString(),
    name: name,
    phone: phone,
    address: address,
    product: CONFIG.PRODUCT_NAME,
    quantity: 1,
    total: CONFIG.PRICE + CONFIG.DELIVERY_CHARGE,
  };

  try {
    if (CONFIG.SHEET_URL) {
      // ✅ শিট থেকে আসল "success" উত্তর এলে তবেই সফল দেখানো হয়
      await sendToSheet(payload);
      showModal("✅", "অর্ডার সফল হয়েছে! 🎉",
        "ধন্যবাদ " + name + "! আপনার অর্ডারটি Google Sheet-এ জমা হয়েছে। আমাদের প্রতিনিধি খুব শীঘ্রই কল করে অর্ডারটি কনফার্ম করবেন। ইনশাআল্লাহ।");
      $("orderForm").reset();
    } else {
      // ডেমো মোড: শিট URL বসানো নেই
      try {
        const demo = JSON.parse(localStorage.getItem("smoothlife-demo-orders") || "[]");
        demo.push(payload);
        localStorage.setItem("smoothlife-demo-orders", JSON.stringify(demo));
      } catch (_) {}
      showModal("✅", "অর্ডার সফল হয়েছে! (ডেমো)",
        "এটি ডেমো মোড — Google Sheet এখনো যুক্ত হয়নি। script.js ফাইলের CONFIG.SHEET_URL-এ আপনার Apps Script URL বসালেই অর্ডার সরাসরি Google Sheet-এ জমা হবে।");
      $("orderForm").reset();
    }
  } catch (err) {
    const ex = explainError(err);
    showModal(ex[0], ex[1], ex[2]);
    // ❌ ব্যর্থ হলে ফর্মের তথ্য মুছবে না — কাস্টমার আবার চেষ্টা করতে পারবে
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}

/* ---------- কনসোল থেকে দ্রুত টেস্ট: slTestSheet() ---------- */
window.slTestSheet = async function () {
  if (!CONFIG.SHEET_URL) { console.log("⚠ SHEET_URL খালি — script.js-এ URL বসান"); return { ok: false }; }
  try {
    const r = await sendToSheet({ name: "🔌 কনসোল টেস্ট", phone: "01700000000", address: "টেস্ট সারি — মুছে ফেলুন", product: "TEST", quantity: 0, total: 0 });
    console.log("✅ শিট কানেকশন ঠিক আছে!", r);
    return { ok: true, response: r };
  } catch (err) {
    console.log("❌ ব্যর্থ:", explainError(err), err);
    return { ok: false, error: String(err) };
  }
};
