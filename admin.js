(() => {
  const loginForm = document.getElementById("loginForm");
  const genderForm = document.getElementById("genderForm");
  const loginStatus = document.getElementById("loginStatus");
  const saveStatus = document.getElementById("saveStatus");
  const currentValue = document.getElementById("currentValue");
  const loginBtn = document.getElementById("loginBtn");
  const saveBtn = document.getElementById("saveBtn");

  // パスワードは画面をリロードするまでの間だけメモリ上に保持する
  // （毎回サーバー側でも検証されるため、これはあくまで利便性のため）
  let sessionPassword = sessionStorage.getItem("gr_admin_pw") || null;

  function setStatus(el, message, type) {
    el.textContent = message;
    el.className = "status-msg" + (type ? " " + type : "");
  }

  async function fetchCurrentGender() {
    try {
      const res = await fetch("/api/gender");
      const data = await res.json();
      if (data.gender === "boy") {
        currentValue.textContent = "現在の設定：👦 男の子";
        document.getElementById("genderBoy").checked = true;
      } else if (data.gender === "girl") {
        currentValue.textContent = "現在の設定：👧 女の子";
        document.getElementById("genderGirl").checked = true;
      } else {
        currentValue.textContent = "現在の設定：未登録";
      }
    } catch (err) {
      currentValue.textContent = "現在の設定を取得できませんでした";
    }
  }

  async function tryLogin(password) {
    const res = await fetch("/api/admin-login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    return res.json();
  }

  function showGenderForm() {
    loginForm.classList.add("hidden");
    genderForm.classList.remove("hidden");
    fetchCurrentGender();
  }

  // すでにこのブラウザでログイン済みならスキップ
  if (sessionPassword) {
    tryLogin(sessionPassword).then((data) => {
      if (data.ok) {
        showGenderForm();
      } else {
        sessionStorage.removeItem("gr_admin_pw");
        sessionPassword = null;
      }
    });
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = document.getElementById("password").value;
    loginBtn.disabled = true;
    setStatus(loginStatus, "確認中...", "");

    try {
      const data = await tryLogin(password);
      if (data.ok) {
        sessionPassword = password;
        sessionStorage.setItem("gr_admin_pw", password);
        setStatus(loginStatus, "", "");
        showGenderForm();
      } else {
        setStatus(loginStatus, data.error || "パスワードが違います。", "error");
      }
    } catch (err) {
      setStatus(loginStatus, "通信エラーが発生しました。", "error");
    } finally {
      loginBtn.disabled = false;
    }
  });

  genderForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const selected = genderForm.querySelector('input[name="gender"]:checked');
    if (!selected) {
      setStatus(saveStatus, "性別を選択してください。", "error");
      return;
    }

    saveBtn.disabled = true;
    setStatus(saveStatus, "保存中...", "");

    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: sessionPassword, gender: selected.value }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus(saveStatus, "保存しました！公開ページに反映されます 🎉", "success");
        fetchCurrentGender();
      } else {
        setStatus(saveStatus, data.error || "保存に失敗しました。", "error");
      }
    } catch (err) {
      setStatus(saveStatus, "通信エラーが発生しました。", "error");
    } finally {
      saveBtn.disabled = false;
    }
  });
})();
