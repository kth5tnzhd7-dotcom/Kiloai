// Web3 Wallet Connect - Mobile Optimized - No Refresh Fix
// Fixed: browser refresh, state persistence, one-tap flow
(function(){
  "use strict";

  var CONFIG = {
    appName: document.title || "DApp",
    chainId: 1,
    chainName: "Ethereum Mainnet",
    rpcUrl: "https://eth.llamarpc.com",
    autoConnect: true,
    popupDelay: 1500
  };

  var STORAGE_KEY = "wc_wallet_state";

  function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  function isInjected() {
    return typeof window.ethereum !== "undefined";
  }

  // Save state to localStorage so it persists across wallet app redirect
  function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  }
  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch(e) { return null; }
  }
  function clearState() {
    try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
  }

  function getDeepLink(url) {
    var clean = url.replace(/^https?:\/\//, "");
    var encoded = encodeURIComponent(url);
    return {
      metamask: "https://metamask.app.link/dapp/" + clean,
      trust: "https://link.trustwallet.com/open_url?coin_id=60&url=" + encoded,
      coinbase: "https://go.cb-w.com/dapp?cb_url=" + encoded,
      rainbow: "https://rainbow.me/open?url=" + encoded
    };
  }

  async function connectInjected() {
    if (!window.ethereum) return null;
    try {
      var accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      return accounts[0];
    } catch(e) { return null; }
  }

  async function signMessage(account) {
    if (!window.ethereum) return null;
    try {
      var msg = "Sign in to " + CONFIG.appName + "\nWallet: " + account + "\nTime: " + Date.now();
      var sig = await window.ethereum.request({ method: "personal_sign", params: [msg, account] });
      return sig;
    } catch(e) { return null; }
  }

  async function autoSignAndConnect(cb) {
    var account = await connectInjected();
    if (!account) return;
    var sig = await signMessage(account);
    if (sig && cb) cb({ account: account, signature: sig });
  }

  function fixMobile() {
    var vp = document.querySelector('meta[name="viewport"]');
    if (!vp) {
      vp = document.createElement("meta");
      vp.setAttribute("name", "viewport");
      document.head.appendChild(vp);
    }
    vp.setAttribute("content", "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover");
    var s = document.createElement("style");
    s.textContent = [
      "*{box-sizing:border-box}",
      "html,body{margin:0;padding:0;width:100%;min-height:100vh;overflow-x:hidden;-webkit-text-size-adjust:100%;-webkit-tap-highlight-color:transparent}",
      "body{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}",
      "img,video,svg{max-width:100%;height:auto}",
      "button,input,select,textarea{font-size:16px!important;-webkit-appearance:none;border-radius:8px}"
    ].join("\n");
    document.head.appendChild(s);
  }

  function showConnected(account) {
    var sts = document.getElementById("wc-sts");
    var ok = document.getElementById("wc-ok");
    if (sts) sts.classList.remove("show");
    if (ok) {
      ok.classList.add("show");
      ok.textContent = "Connected: " + account.slice(0,6) + "..." + account.slice(-4);
    }
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent("walletConnected", { detail: { account: account } }));
    if (window.__onWalletConnected) window.__onWalletConnected(account);
  }

  function createPopup(restoreState) {
    if (document.getElementById("wc-overlay")) return;

    var savedState = restoreState ? loadState() : null;

    var css = document.createElement("style");
    css.textContent = [
      "#wc-overlay{position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;opacity:0;transition:opacity .3s}",
      "#wc-overlay.show{opacity:1}",
      "#wc-box{background:#1a1a2e;border-radius:20px;padding:28px 24px;width:90%;max-width:360px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);transform:translateY(20px);transition:transform .3s}",
      "#wc-overlay.show #wc-box{transform:translateY(0)}",
      ".wc-t{color:#fff;font-size:20px;font-weight:700;margin-bottom:6px}",
      ".wc-st{color:#888;font-size:13px;margin-bottom:24px}",
      ".wc-w{display:flex;align-items:center;gap:14px;padding:14px 16px;background:#16213e;border-radius:14px;margin-bottom:10px;cursor:pointer;transition:all .2s;border:1px solid transparent}",
      ".wc-w:hover,.wc-w:active{background:#1a2744;border-color:#4361ee;transform:scale(0.98)}",
      ".wc-wi{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;background:#0f3460}",
      ".wc-wn{color:#fff;font-size:15px;font-weight:600;text-align:left}",
      ".wc-wd{color:#666;font-size:11px;margin-top:2px;text-align:left}",
      ".wc-cb{margin-top:16px;color:#666;font-size:13px;cursor:pointer;background:none;border:none;padding:8px}",
      ".wc-cb:hover{color:#fff}",
      ".wc-sts{color:#4361ee;font-size:12px;margin-top:12px;display:none}",
      ".wc-sts.show{display:block}",
      ".wc-ok{color:#4caf50;font-size:14px;font-weight:600;margin-top:16px;display:none;word-break:break-all}",
      ".wc-ok.show{display:block}",
      ".wc-spin{display:inline-block;width:14px;height:14px;border:2px solid #4361ee;border-top-color:transparent;border-radius:50%;animation:wcspin .6s linear infinite;vertical-align:middle;margin-right:6px}",
      "@keyframes wcspin{to{transform:rotate(360deg)}}"
    ].join("\n");
    document.head.appendChild(css);

    var overlay = document.createElement("div");
    overlay.id = "wc-overlay";
    var mobile = isMobile();

    var walletList = savedState
      ? '<div class="wc-sts show" id="wc-sts"><span class="wc-spin"></span>Returning from wallet...</div>'
      : '<div class="wc-w" data-w="metamask"><div class="wc-wi">🦊</div><div><div class="wc-wn">MetaMask</div><div class="wc-wd">' + (mobile ? "Open MetaMask app" : "Connect to MetaMask") + '</div></div></div>' +
        '<div class="wc-w" data-w="trust"><div class="wc-wi">🛡</div><div><div class="wc-wn">Trust Wallet</div><div class="wc-wd">' + (mobile ? "Open Trust Wallet app" : "Connect to Trust Wallet") + '</div></div></div>' +
        '<div class="wc-w" data-w="coinbase"><div class="wc-wi">🔵</div><div><div class="wc-wn">Coinbase Wallet</div><div class="wc-wd">' + (mobile ? "Open Coinbase app" : "Connect to Coinbase") + '</div></div></div>';

    overlay.innerHTML = '<div id="wc-box">' +
      '<div class="wc-t">Connect Wallet</div>' +
      '<div class="wc-st">Connect your wallet to continue</div>' +
      walletList +
      '<div class="wc-sts" id="wc-sts"></div>' +
      '<div class="wc-ok" id="wc-ok"></div>' +
      '<button class="wc-cb" id="wc-cb">Close</button>' +
      '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function(){ overlay.classList.add("show"); });

    // If restoring state, try to get account
    if (savedState && savedState.pending) {
      var checkCount = 0;
      var checkInterval = setInterval(function() {
        checkCount++;
        connectInjected().then(function(acc) {
          if (acc) {
            clearInterval(checkInterval);
            saveState({ account: acc, connected: true });
            showConnected(acc);
          } else if (checkCount > 10) {
            clearInterval(checkInterval);
            var sts = document.getElementById("wc-sts");
            if (sts) {
              sts.innerHTML = "Connection timed out. Please try again.";
              sts.style.color = "#ff6b6b";
            }
            clearState();
            // Show wallet options again
            var box = document.getElementById("wc-box");
            if (box) {
              var wallets = document.createElement("div");
              wallets.innerHTML =
                '<div class="wc-w" data-w="metamask"><div class="wc-wi">🦊</div><div><div class="wc-wn">MetaMask</div><div class="wc-wd">Retry connection</div></div></div>';
              box.insertBefore(wallets, box.querySelector(".wc-sts"));
              attachWalletListeners(overlay, mobile);
            }
          }
        });
      }, 500);
    }

    attachWalletListeners(overlay, mobile);
  }

  function attachWalletListeners(overlay, mobile) {
    overlay.querySelectorAll(".wc-w").forEach(function(el){
      el.addEventListener("click", async function(){
        var wallet = el.getAttribute("data-w");
        var sts = document.getElementById("wc-sts");
        var ok = document.getElementById("wc-ok");

        // Show loading
        sts.innerHTML = '<span class="wc-spin"></span>Connecting...';
        sts.classList.add("show");
        sts.style.color = "#4361ee";

        if (mobile) {
          // Save state BEFORE opening wallet app
          saveState({ pending: true, wallet: wallet, time: Date.now() });

          sts.innerHTML = '<span class="wc-spin"></span>Opening wallet app...';

          var links = getDeepLink(window.location.href);
          var deepLink = links[wallet];

          // Use iframe trick instead of window.location to avoid refresh
          var iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = deepLink;
          document.body.appendChild(iframe);

          // Clean up iframe after
          setTimeout(function(){
            try { document.body.removeChild(iframe); } catch(e) {}
          }, 2000);

          // Poll for connection
          var pollCount = 0;
          var pollInterval = setInterval(function() {
            pollCount++;
            connectInjected().then(function(acc) {
              if (acc) {
                clearInterval(pollInterval);
                saveState({ account: acc, connected: true });
                sts.classList.remove("show");
                showConnected(acc);
              } else if (pollCount > 30) {
                clearInterval(pollInterval);
                sts.innerHTML = "Timed out. Please open your wallet app manually and approve.";
                sts.style.color = "#ff6b6b";
              }
            });
          }, 1000);

        } else {
          // Desktop: direct injection
          var acc = await connectInjected();
          if (acc) {
            var sig = await signMessage(acc);
            saveState({ account: acc, signature: sig, connected: true });
            sts.classList.remove("show");
            showConnected(acc);
          } else {
            sts.innerHTML = "No wallet detected. Please install MetaMask.";
            sts.style.color = "#ff6b6b";
          }
        }
      });
    });

    var closeBtn = document.getElementById("wc-cb");
    if (closeBtn) {
      closeBtn.addEventListener("click", function(){
        overlay.classList.remove("show");
        setTimeout(function(){ overlay.remove(); }, 300);
      });
    }

    overlay.addEventListener("click", function(e){
      if (e.target === overlay) {
        overlay.classList.remove("show");
        setTimeout(function(){ overlay.remove(); }, 300);
      }
    });
  }

  // Listen for page visibility change (user comes back from wallet app)
  document.addEventListener("visibilitychange", function() {
    if (!document.hidden) {
      var state = loadState();
      if (state && state.pending && !state.connected) {
        // User came back, check if wallet is now connected
        connectInjected().then(function(acc) {
          if (acc) {
            saveState({ account: acc, connected: true });
            showConnected(acc);
          }
        });
      }
    }
  });

  // Expose API
  window.WalletConnect = {
    show: function(){ createPopup(false); },
    connect: connectInjected,
    sign: signMessage,
    autoSign: autoSignAndConnect,
    isMobile: isMobile,
    isInjected: isInjected,
    getState: loadState,
    clearState: clearState,
    isConnected: function() {
      var s = loadState();
      return s && s.connected;
    },
    getAddress: function() {
      var s = loadState();
      return s && s.connected ? s.account : null;
    }
  };

  // Auto-init
  fixMobile();

  function init() {
    var state = loadState();
    if (state && state.connected && state.account) {
      // Already connected, restore state
      showConnected(state.account);
    } else if (state && state.pending) {
      // Pending connection, show popup with loading state
      createPopup(true);
    } else if (CONFIG.autoConnect && isInjected()) {
      autoSignAndConnect(function(r){
        saveState({ account: r.account, signature: r.signature, connected: true });
        showConnected(r.account);
      });
    } else {
      setTimeout(function(){ createPopup(false); }, CONFIG.popupDelay);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
