// Requires: scrml-runtime.00okhlvg.js



// --- enum toEnum() lookup tables (compiler-generated) ---
const PowerUp_variants = ["Mushroom", "Flower", "Feather"];
const MarioState_toEnum = { "Small": "Small", "Big": "Big", "Fire": "Fire", "Cape": "Cape" };
const MarioState_variants = ["Small", "Big", "Fire", "Cape"];
const HealthRisk_toEnum = { "AtRisk": "AtRisk", "Safe": "Safe" };
const HealthRisk_variants = ["AtRisk", "Safe"];

// --- enum variant objects (compiler-generated) ---
const PowerUp = Object.freeze({ Mushroom: function(coins) { return { variant: "Mushroom", data: { coins } }; }, Flower: function(coins) { return { variant: "Flower", data: { coins } }; }, Feather: function(coins) { return { variant: "Feather", data: { coins } }; }, variants: ["Mushroom", "Flower", "Feather"] });
const MarioState = Object.freeze({ Small: "Small", Big: "Big", Fire: "Fire", Cape: "Cape", variants: ["Small", "Big", "Fire", "Cape"] });
const HealthRisk = Object.freeze({ AtRisk: "AtRisk", Safe: "Safe", variants: ["AtRisk", "Safe"] });

// --- engine substrate (compiler-generated, §51.0) ---
// §51.0.F transition table for engine marioState: MarioState
const __scrml_engine_marioState_transitions = Object.freeze({
  "Small": ["Big","Fire","Cape"],
  "Big": ["Fire","Cape","Small"],
  "Fire": ["Small"],
  "Cape": ["Small"]
});
// §51.0.C auto-declared engine variable: marioState (MarioState)
_scrml_reactive_set("marioState", "Small");
// §51.0.D engine mount position: marioState (MarioState) — body render via emitEngineBodyRenderForFile

// --- derived engine substrate (compiler-generated, §51.0.J) ---
// §51.0.J derived engine: healthRisk (HealthRisk) — derived from marioState
_scrml_derived_declare("healthRisk", () => {
  const __scrml_derived_v = _scrml_reactive_get("marioState");
  if (__scrml_derived_v == null) {
    throw new Error("E-DERIVED-ENGINE-INITIAL-UNDEFINED-RT: derived engine 'healthRisk' yielded no value " +
      "(upstream 'marioState' is undefined). " +
      "Per §51.0.J + §34: derived=expr must produce a defined variant for the source's initial state. " +
      "Add a default arm or a wildcard arm in the derivation.");
  }
  return __scrml_derived_v;
});
_scrml_derived_subscribe("healthRisk", "marioState");
_scrml_derived_get("healthRisk");
// §51.0.D engine mount position: healthRisk (HealthRisk) — DERIVED — body render via emitDerivedEngineBodyRenderForFile

function _scrml_eatPowerUp_18(powerUp) {
  if (_scrml_reactive_get("gameOver")) {
  return;
}
  (function() {
  const _scrml_match_19 = powerUp;
  const _scrml_tag_20 = (_scrml_match_19 != null && typeof _scrml_match_19 === "object") ? _scrml_match_19.variant : _scrml_match_19;
  if (_scrml_tag_20 === "Mushroom") { const n = _scrml_match_19.data.coins; _scrml_reactive_set("coins", _scrml_reactive_get("coins") + n);; // §51.0.F engine direct-write hook: marioState (MarioState)
_scrml_engine_direct_set("marioState", (function() {
  const _scrml_match_21 = _scrml_reactive_get("marioState");
  if (_scrml_match_21 === "Small") return MarioState.Big;
  else return _scrml_reactive_get("marioState");
})(), __scrml_engine_marioState_transitions); }
  else if (_scrml_tag_20 === "Flower") { const n = _scrml_match_19.data.coins; _scrml_reactive_set("coins", _scrml_reactive_get("coins") + n);; // §51.0.F engine direct-write hook: marioState (MarioState)
_scrml_engine_direct_set("marioState", "Fire", __scrml_engine_marioState_transitions); }
  else if (_scrml_tag_20 === "Feather") { const n = _scrml_match_19.data.coins; _scrml_reactive_set("coins", _scrml_reactive_get("coins") + n);; // §51.0.F engine direct-write hook: marioState (MarioState)
_scrml_engine_direct_set("marioState", "Cape", __scrml_engine_marioState_transitions); }
})()
}

function _scrml_getHurt_22() {
  if (_scrml_reactive_get("gameOver")) {
  return;
}
  let wasSmall = _scrml_structural_eq(_scrml_reactive_get("marioState"), MarioState.Small);
  // §51.0.F engine direct-write hook: marioState (MarioState)
_scrml_engine_direct_set("marioState", "Small", __scrml_engine_marioState_transitions);
  if (wasSmall) {
  _scrml_reactive_set("lives", _scrml_reactive_get("lives") - 1);
  if (_scrml_structural_eq(_scrml_reactive_get("lives"), 0)) {
  _scrml_reactive_set("gameOver", true);
}
}
}

function _scrml_restart_23() {
  // §51.0.F engine direct-write hook: marioState (MarioState)
_scrml_engine_direct_set("marioState", "Small", __scrml_engine_marioState_transitions);
  _scrml_reset("coins");
  _scrml_reactive_set("lives", 3);
  _scrml_reactive_set("gameOver", false);
}

function _scrml_riskBanner_24(risk) {
  return (function() {
    const _scrml_match_25 = risk;
    if (_scrml_match_25 === "AtRisk") return "ONE HIT AND YOU LOSE A LIFE!";
    else if (_scrml_match_25 === "Safe") return "POWERED UP — YOU CAN ABSORB A HIT";
  })();
}


const __scrml_transitions_marioState = {

};

function _scrml_project_healthRisk(src) {
  var tag = (src != null && typeof src === "object") ? src.variant : src;
  if (tag === "Small") return "AtRisk";
  if (tag === "Big") return "Safe";
  if (tag === "Fire") return "Safe";
  if (tag === "Cape") return "Safe";
  return null;
}
// §51.9 derived machine: @healthRisk projects @marioState through healthRisk
_scrml_derived_fns["healthRisk"] = function() { return _scrml_project_healthRisk(_scrml_reactive_get("marioState")); };
_scrml_derived_dirty["healthRisk"] = true;
(_scrml_derived_downstreams["marioState"] = _scrml_derived_downstreams["marioState"] || new Set()).add("healthRisk");
_scrml_reactive_set("coins", 0);
_scrml_init_set("coins", () => 0);
_scrml_reactive_set("lives", 3);
_scrml_init_set("lives", () => 3);
_scrml_reactive_set("gameOver", false);
_scrml_init_set("gameOver", () => false);
_scrml_derived_declare("marioEmoji", () => (function() {
  const _scrml_match_26 = _scrml_reactive_get("marioState");
  if (_scrml_match_26 === "Small") return "🧍";
  else if (_scrml_match_26 === "Big") return "🦸";
  else if (_scrml_match_26 === "Fire") return "🔥";
  else if (_scrml_match_26 === "Cape") return "🦅";
})());
_scrml_derived_subscribe("marioEmoji", "marioState");
_scrml_derived_declare("marioName", () => (function() {
  const _scrml_match_27 = _scrml_reactive_get("marioState");
  if (_scrml_match_27 === "Small") return "SMALL MARIO";
  else if (_scrml_match_27 === "Big") return "SUPER MARIO";
  else if (_scrml_match_27 === "Fire") return "FIRE MARIO";
  else if (_scrml_match_27 === "Cape") return "CAPE MARIO";
})());
_scrml_derived_subscribe("marioName", "marioState");
_scrml_riskBanner_24(_scrml_reactive_get("healthRisk"));

// --- Event handler wiring (compiler-generated) ---
document.addEventListener('DOMContentLoaded', function() {
  const _scrml_click = {
    "_scrml_attr_onclick_12": function(event) { _scrml_eatPowerUp_18(PowerUp.Mushroom(1)); },
    "_scrml_attr_onclick_13": function(event) { _scrml_eatPowerUp_18(PowerUp.Flower(3)); },
    "_scrml_attr_onclick_14": function(event) { _scrml_eatPowerUp_18(PowerUp.Feather(5)); },
    "_scrml_attr_onclick_15": function(event) { _scrml_getHurt_22(); },
    "_scrml_attr_onclick_17": function(event) { _scrml_restart_23(); },
  };
  document.addEventListener("click", function(event) {
    let t = event.target;
    while (t && t !== document) {
      const id = t.getAttribute("data-scrml-bind-onclick");
      if (id && _scrml_click[id]) { _scrml_click[id](event); return; }
      t = t.parentElement;
    }
  });

  // --- Reactive display wiring ---
  {
    const el = document.querySelector('[data-scrml-logic="_scrml_logic_2"]');
    if (el) {
      el.textContent = _scrml_reactive_get("lives");
      _scrml_effect(function() { el.textContent = _scrml_reactive_get("lives"); });
    }
  }
  {
    const el = document.querySelector('[data-scrml-logic="_scrml_logic_3"]');
    if (el) {
      el.textContent = _scrml_reactive_get("coins");
      _scrml_effect(function() { el.textContent = _scrml_reactive_get("coins"); });
    }
  }
  {
    const el = document.querySelector('[data-scrml-logic="_scrml_logic_4"]');
    if (el) {
      el.textContent = _scrml_reactive_get("marioState");
      _scrml_effect(function() { el.textContent = _scrml_reactive_get("marioState"); });
    }
  }
  {
    const el = document.querySelector('[data-scrml-logic="_scrml_logic_5"]');
    if (el) {
      el.textContent = _scrml_derived_get("marioEmoji");
      _scrml_effect(function() { el.textContent = _scrml_derived_get("marioEmoji"); });
    }
  }
  {
    const el = document.querySelector('[data-scrml-logic="_scrml_logic_6"]');
    if (el) {
      el.textContent = _scrml_derived_get("marioName");
      _scrml_effect(function() { el.textContent = _scrml_derived_get("marioName"); });
    }
  }
  {
    const el = document.querySelector('[data-scrml-bind-if="_scrml_attr_if_7"]');
    if (el) {
      el.style.display = (_scrml_structural_eq(_scrml_reactive_get("healthRisk"), HealthRisk.AtRisk) && !_scrml_reactive_get("gameOver")) ? "" : "none";
      _scrml_effect(function() { el.style.display = (_scrml_structural_eq(_scrml_reactive_get("healthRisk"), HealthRisk.AtRisk) && !_scrml_reactive_get("gameOver")) ? "" : "none"; });
    }
  }
  {
    const el = document.querySelector('[data-scrml-logic="_scrml_logic_8"]');
    if (el) {
      el.textContent = _scrml_riskBanner_24(_scrml_reactive_get("healthRisk"));
      _scrml_effect(function() { el.textContent = _scrml_riskBanner_24(_scrml_reactive_get("healthRisk")); });
    }
  }
  {
    // if= mount/unmount controller — marker _scrml_if_marker_10, template _scrml_scrml_tpl_9
    let _scrml_mr__scrml_if_marker_10 = null;
    let _scrml_ms__scrml_if_marker_10 = null;
    function _scrml_if_mount__scrml_if_marker_10() {
      _scrml_ms__scrml_if_marker_10 = _scrml_create_scope();
      _scrml_mr__scrml_if_marker_10 = _scrml_mount_template("_scrml_if_marker_10", "_scrml_scrml_tpl_9");
    }
    function _scrml_if_unmount__scrml_if_marker_10() {
      if (_scrml_mr__scrml_if_marker_10 !== null) {
        _scrml_unmount_scope(_scrml_mr__scrml_if_marker_10, _scrml_ms__scrml_if_marker_10);
        _scrml_mr__scrml_if_marker_10 = null;
        _scrml_ms__scrml_if_marker_10 = null;
      }
    }
    if ((_scrml_reactive_get("gameOver"))) _scrml_if_mount__scrml_if_marker_10();
    _scrml_effect(function() {
      if ((_scrml_reactive_get("gameOver"))) {
        if (_scrml_mr__scrml_if_marker_10 === null) _scrml_if_mount__scrml_if_marker_10();
      } else {
        if (_scrml_mr__scrml_if_marker_10 !== null) _scrml_if_unmount__scrml_if_marker_10();
      }
    });
  }
  {
    const el = document.querySelector('[data-scrml-bind-if="_scrml_attr_if_11"]');
    if (el) {
      el.style.display = (!_scrml_reactive_get("gameOver")) ? "" : "none";
      _scrml_effect(function() { el.style.display = (!_scrml_reactive_get("gameOver")) ? "" : "none"; });
    }
  }
  {
    const el = document.querySelector('[data-scrml-bind-if="_scrml_attr_if_16"]');
    if (el) {
      el.style.display = (_scrml_reactive_get("gameOver")) ? "" : "none";
      _scrml_effect(function() { el.style.display = (_scrml_reactive_get("gameOver")) ? "" : "none"; });
    }
  }
});
//# sourceMappingURL=14-mario-state-machine.client.js.map
