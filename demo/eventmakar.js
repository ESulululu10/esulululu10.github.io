const {
  useState,
  useCallback,
  useRef
} = React;
const VIRTUAL_CHARS = [{
  name: "Barbarian",
  emoji: "\u2694\uFE0F"
}, {
  name: "Skeleton",
  emoji: "\uD83D\uDC80"
}, {
  name: "Spider",
  emoji: "\uD83D\uDD77\uFE0F"
}, {
  name: "Woman",
  emoji: "\uD83D\uDC69"
}];
const PHYSICAL_DEVS = [{
  name: "Car",
  emoji: "\uD83D\uDE97"
}, {
  name: "House",
  emoji: "\uD83C\uDFE0"
}, {
  name: "Garage",
  emoji: "\uD83C\uDFED"
}, {
  name: "Helicopter",
  emoji: "\uD83D\uDE81"
}, {
  name: "Catapult",
  emoji: "\uD83C\uDFF9"
}, {
  name: "Train",
  emoji: "\uD83D\uDE82"
}, {
  name: "Truck",
  emoji: "\uD83D\uDE9A"
}, {
  name: "Airplane",
  emoji: "\u2708\uFE0F"
}];
const VIRTUAL_FNS = [{
  val: "1",
  label: "Walk"
}, {
  val: "2",
  label: "Run"
}, {
  val: "3",
  label: "Attack"
}, {
  val: "4",
  label: "Dance"
}, {
  val: "5",
  label: "Jump"
}, {
  val: "6",
  label: "Idle"
}];
const PHYSICAL_FNS = [{
  val: "1",
  label: "Forward"
}, {
  val: "2",
  label: "Backward"
}, {
  val: "3",
  label: "Left"
}, {
  val: "4",
  label: "Right"
}, {
  val: "5",
  label: "Open"
}, {
  val: "6",
  label: "Close"
}, {
  val: "7",
  label: "Spin"
}, {
  val: "8",
  label: "Stop"
}];
const UI_CONTROLS = [{
  name: "Joystick",
  icon: "\u271A",
  desc: "Characters",
  color: "#0EA5E9"
}, {
  name: "Navigation",
  icon: "\u2B05",
  desc: "Wheels",
  color: "#8B5CF6"
}, {
  name: "Slider",
  icon: "\u2195",
  desc: "Servos",
  color: "#F59E0B"
}, {
  name: "Toggle",
  icon: "\u2714",
  desc: "On/Off",
  color: "#10B981"
}, {
  name: "Action",
  icon: "\u25B6",
  desc: "Auto",
  color: "#EF4444"
}];
const getType = (srcV, trgV) => {
  if (!srcV && trgV) return "1";
  if (!srcV && !trgV) return "2";
  if (srcV && trgV) return "3";
  if (srcV && !trgV) return "4";
  return "0";
};
const TYPE_INFO = {
  "1": {
    label: "Physical \u2192 Virtual",
    short: "P\u2192V",
    bg: "#DBEAFE",
    color: "#1E40AF"
  },
  "2": {
    label: "Physical \u2192 Physical",
    short: "P\u2192P",
    bg: "#E0E7FF",
    color: "#3730A3"
  },
  "3": {
    label: "Virtual \u2192 Virtual",
    short: "V\u2192V",
    bg: "#F3E8FF",
    color: "#6B21A8"
  },
  "4": {
    label: "Virtual \u2192 Physical",
    short: "V\u2192P",
    bg: "#FEF3C7",
    color: "#92400E"
  }
};
const getFnLabel = (val, isVirtual) => {
  const list = isVirtual ? VIRTUAL_FNS : PHYSICAL_FNS;
  const fn = list.find(f => f.val === val);
  return fn ? fn.label : val;
};
function EventMakAR() {
  const [events, setEvents] = useState([]);
  const [evName, setEvName] = useState("");
  const [subjType, setSubjType] = useState(null);
  const [subjEntity, setSubjEntity] = useState(null);
  const [subjFn, setSubjFn] = useState("1");
  const [targType, setTargType] = useState(null);
  const [targEntity, setTargEntity] = useState(null);
  const [targFn, setTargFn] = useState("1");
  const [uiCtrl, setUiCtrl] = useState(null);
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);
  const [step, setStep] = useState(1);
  const formRef = useRef(null);
  const showToast = useCallback(msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);
  const isValid = evName.trim() && subjType !== null && subjEntity && targType !== null && targEntity && uiCtrl;
  const addEvent = () => {
    if (!isValid) return;
    const ev = {
      Name: evName.trim(),
      Type: getType(subjType === "virtual", targType === "virtual"),
      Source: subjEntity,
      Target: targEntity,
      SourceFunction: subjFn,
      TargetFunction: targFn,
      SourceControl: uiCtrl
    };
    setEvents(prev => [...prev, ev]);
    setEvName("");
    setStep(1);
    showToast(`Added: ${ev.Name}`);
  };
  const removeEvent = i => {
    setEvents(prev => prev.filter((_, idx) => idx !== i));
  };
  const getJson = () => JSON.stringify({
    events
  }, null, 2);
  const downloadJson = () => {
    const blob = new Blob([getJson()], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Events.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Events.txt downloaded!");
  };
  const copyJson = () => {
    navigator.clipboard.writeText(getJson()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  const handleSubjType = t => {
    setSubjType(t);
    setSubjEntity(null);
    setSubjFn("1");
  };
  const handleTargType = t => {
    setTargType(t);
    setTargEntity(null);
    setTargFn("1");
  };
  const stepComplete = s => {
    if (s === 1) return !!evName.trim();
    if (s === 2) return subjType !== null && subjEntity !== null;
    if (s === 3) return targType !== null && targEntity !== null;
    if (s === 4) return uiCtrl !== null;
    return false;
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Nunito', 'Segoe UI', sans-serif",
      maxWidth: 520,
      margin: "0 auto",
      padding: "0 16px 100px",
      background: "transparent"
    }
  }, /*#__PURE__*/React.createElement("link", {
    href: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap",
    rel: "stylesheet"
  }), toast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      top: 20,
      left: "50%",
      transform: "translateX(-50%)",
      background: "#10B981",
      color: "#fff",
      padding: "10px 24px",
      borderRadius: 50,
      fontSize: 14,
      fontWeight: 700,
      zIndex: 999,
      boxShadow: "0 4px 20px rgba(16,185,129,0.4)",
      animation: "slideDown 0.3s ease"
    }
  }, toast), /*#__PURE__*/React.createElement("style", null, `
        @keyframes slideDown { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        .entity-btn:active { transform: scale(0.95) !important; }
        .step-section { animation: fadeIn 0.3s ease; }
      `), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 0 8px"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "'Fredoka One', cursive",
      fontSize: 36,
      margin: 0,
      letterSpacing: -0.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#0EA5E9"
    }
  }, "Event"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#10B981"
    }
  }, "Mak"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#F59E0B"
    }
  }, "AR")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      color: "#94A3B8",
      marginTop: 4,
      fontWeight: 600
    }
  }, "Create events for your story")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      margin: "16px 0 24px",
      padding: "0 4px"
    }
  }, [1, 2, 3, 4].map(s => /*#__PURE__*/React.createElement("div", {
    key: s,
    style: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      background: stepComplete(s) ? "#10B981" : step === s ? "#0EA5E9" : "#E2E8F0",
      transition: "all 0.3s ease"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    ref: formRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "step-section",
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      height: 28,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 13,
      fontWeight: 800,
      background: stepComplete(1) ? "#10B981" : step === 1 ? "#0EA5E9" : "#E2E8F0",
      color: stepComplete(1) || step === 1 ? "#fff" : "#94A3B8"
    }
  }, "1"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 700,
      color: "#334155"
    }
  }, "Event name")), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: evName,
    onChange: e => {
      setEvName(e.target.value);
      setStep(1);
    },
    onFocus: () => setStep(1),
    placeholder: "e.g. Skeleton invades the house",
    style: {
      width: "100%",
      padding: "14px 16px",
      border: "2px solid",
      borderColor: evName.trim() ? "#10B981" : step === 1 ? "#0EA5E9" : "#E2E8F0",
      borderRadius: 14,
      fontSize: 15,
      fontFamily: "inherit",
      fontWeight: 600,
      outline: "none",
      background: "#F8FAFC",
      transition: "all 0.2s",
      boxSizing: "border-box",
      color: "#1E293B"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "step-section",
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      height: 28,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 13,
      fontWeight: 800,
      background: stepComplete(2) ? "#10B981" : step === 2 ? "#0EA5E9" : "#E2E8F0",
      color: stepComplete(2) || step === 2 ? "#fff" : "#94A3B8"
    }
  }, "2"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 700,
      color: "#334155"
    }
  }, "Subject"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#94A3B8",
      fontWeight: 600
    }
  }, "who acts")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 12
    }
  }, ["virtual", "physical"].map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    onClick: () => {
      handleSubjType(t);
      setStep(2);
    },
    style: {
      flex: 1,
      padding: "12px 8px",
      border: "2px solid",
      borderColor: subjType === t ? t === "virtual" ? "#8B5CF6" : "#0EA5E9" : "#E2E8F0",
      borderRadius: 12,
      cursor: "pointer",
      fontFamily: "inherit",
      fontWeight: 700,
      fontSize: 13,
      background: subjType === t ? t === "virtual" ? "#F3E8FF" : "#DBEAFE" : "#F8FAFC",
      color: subjType === t ? t === "virtual" ? "#6B21A8" : "#1E40AF" : "#64748B",
      transition: "all 0.2s"
    }
  }, t === "virtual" ? "\uD83D\uDC64 Virtual" : "\uD83D\uDD27 Physical"))), subjType && /*#__PURE__*/React.createElement("div", {
    style: {
      animation: "fadeIn 0.3s ease"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 8,
      marginBottom: 12
    }
  }, (subjType === "virtual" ? VIRTUAL_CHARS : PHYSICAL_DEVS).map(ent => /*#__PURE__*/React.createElement("button", {
    key: ent.name,
    className: "entity-btn",
    onClick: () => {
      setSubjEntity(ent.name);
      setStep(2);
    },
    style: {
      padding: "12px 4px",
      border: "2px solid",
      borderColor: subjEntity === ent.name ? "#10B981" : "#E2E8F0",
      borderRadius: 12,
      cursor: "pointer",
      background: subjEntity === ent.name ? "#ECFDF5" : "#fff",
      textAlign: "center",
      transition: "all 0.15s",
      fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24
    }
  }, ent.emoji), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: subjEntity === ent.name ? "#065F46" : "#64748B",
      marginTop: 2
    }
  }, ent.name)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "#64748B",
      whiteSpace: "nowrap"
    }
  }, "Action:"), /*#__PURE__*/React.createElement("select", {
    value: subjFn,
    onChange: e => setSubjFn(e.target.value),
    style: {
      flex: 1,
      padding: "10px 12px",
      border: "2px solid #E2E8F0",
      borderRadius: 10,
      fontSize: 14,
      fontFamily: "inherit",
      fontWeight: 600,
      background: "#F8FAFC",
      color: "#334155",
      outline: "none"
    }
  }, (subjType === "virtual" ? VIRTUAL_FNS : PHYSICAL_FNS).map(f => /*#__PURE__*/React.createElement("option", {
    key: f.val,
    value: f.val
  }, f.val, " - ", f.label)))))), /*#__PURE__*/React.createElement("div", {
    className: "step-section",
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      height: 28,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 13,
      fontWeight: 800,
      background: stepComplete(3) ? "#10B981" : step === 3 ? "#0EA5E9" : "#E2E8F0",
      color: stepComplete(3) || step === 3 ? "#fff" : "#94A3B8"
    }
  }, "3"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 700,
      color: "#334155"
    }
  }, "Target"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#94A3B8",
      fontWeight: 600
    }
  }, "who reacts")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 12
    }
  }, ["virtual", "physical"].map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    onClick: () => {
      handleTargType(t);
      setStep(3);
    },
    style: {
      flex: 1,
      padding: "12px 8px",
      border: "2px solid",
      borderColor: targType === t ? t === "virtual" ? "#8B5CF6" : "#0EA5E9" : "#E2E8F0",
      borderRadius: 12,
      cursor: "pointer",
      fontFamily: "inherit",
      fontWeight: 700,
      fontSize: 13,
      background: targType === t ? t === "virtual" ? "#F3E8FF" : "#DBEAFE" : "#F8FAFC",
      color: targType === t ? t === "virtual" ? "#6B21A8" : "#1E40AF" : "#64748B",
      transition: "all 0.2s"
    }
  }, t === "virtual" ? "\uD83D\uDC64 Virtual" : "\uD83D\uDD27 Physical"))), targType && /*#__PURE__*/React.createElement("div", {
    style: {
      animation: "fadeIn 0.3s ease"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 8,
      marginBottom: 12
    }
  }, (targType === "virtual" ? VIRTUAL_CHARS : PHYSICAL_DEVS).map(ent => /*#__PURE__*/React.createElement("button", {
    key: ent.name,
    className: "entity-btn",
    onClick: () => {
      setTargEntity(ent.name);
      setStep(3);
    },
    style: {
      padding: "12px 4px",
      border: "2px solid",
      borderColor: targEntity === ent.name ? "#10B981" : "#E2E8F0",
      borderRadius: 12,
      cursor: "pointer",
      background: targEntity === ent.name ? "#ECFDF5" : "#fff",
      textAlign: "center",
      transition: "all 0.15s",
      fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24
    }
  }, ent.emoji), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: targEntity === ent.name ? "#065F46" : "#64748B",
      marginTop: 2
    }
  }, ent.name)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "#64748B",
      whiteSpace: "nowrap"
    }
  }, "Action:"), /*#__PURE__*/React.createElement("select", {
    value: targFn,
    onChange: e => setTargFn(e.target.value),
    style: {
      flex: 1,
      padding: "10px 12px",
      border: "2px solid #E2E8F0",
      borderRadius: 10,
      fontSize: 14,
      fontFamily: "inherit",
      fontWeight: 600,
      background: "#F8FAFC",
      color: "#334155",
      outline: "none"
    }
  }, (targType === "virtual" ? VIRTUAL_FNS : PHYSICAL_FNS).map(f => /*#__PURE__*/React.createElement("option", {
    key: f.val,
    value: f.val
  }, f.val, " - ", f.label)))))), /*#__PURE__*/React.createElement("div", {
    className: "step-section",
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      height: 28,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 13,
      fontWeight: 800,
      background: stepComplete(4) ? "#10B981" : step === 4 ? "#0EA5E9" : "#E2E8F0",
      color: stepComplete(4) || step === 4 ? "#fff" : "#94A3B8"
    }
  }, "4"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 700,
      color: "#334155"
    }
  }, "Controls"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#94A3B8",
      fontWeight: 600
    }
  }, "how you play")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: 6
    }
  }, UI_CONTROLS.map(ctrl => /*#__PURE__*/React.createElement("button", {
    key: ctrl.name,
    className: "entity-btn",
    onClick: () => {
      setUiCtrl(ctrl.name);
      setStep(4);
    },
    style: {
      padding: "14px 4px",
      border: "2px solid",
      borderColor: uiCtrl === ctrl.name ? ctrl.color : "#E2E8F0",
      borderRadius: 12,
      cursor: "pointer",
      background: uiCtrl === ctrl.name ? ctrl.color + "15" : "#fff",
      textAlign: "center",
      transition: "all 0.15s",
      fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      color: ctrl.color
    }
  }, ctrl.icon), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: uiCtrl === ctrl.name ? ctrl.color : "#64748B",
      marginTop: 2
    }
  }, ctrl.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: "#94A3B8",
      marginTop: 1
    }
  }, ctrl.desc))))), /*#__PURE__*/React.createElement("button", {
    onClick: addEvent,
    disabled: !isValid,
    style: {
      width: "100%",
      padding: "16px",
      border: "none",
      borderRadius: 14,
      fontSize: 16,
      fontWeight: 800,
      fontFamily: "inherit",
      cursor: isValid ? "pointer" : "not-allowed",
      background: isValid ? "linear-gradient(135deg, #10B981, #059669)" : "#E2E8F0",
      color: isValid ? "#fff" : "#94A3B8",
      boxShadow: isValid ? "0 4px 16px rgba(16,185,129,0.3)" : "none",
      transition: "all 0.2s",
      transform: isValid ? "scale(1)" : "scale(0.98)",
      marginBottom: 32
    }
  }, isValid ? "\u2795  Add event" : "Fill all fields to add event")), events.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      animation: "fadeIn 0.3s ease"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 18,
      fontWeight: 800,
      color: "#1E293B",
      margin: 0
    }
  }, "Your events (", events.length, ")")), events.map((ev, i) => {
    const tInfo = TYPE_INFO[ev.Type] || {};
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 8,
        position: "relative",
        borderLeft: `4px solid ${tInfo.color || "#94A3B8"}`,
        animation: "fadeIn 0.3s ease"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 800,
        color: "#1E293B",
        marginBottom: 4
      }
    }, ev.Name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "#64748B",
        lineHeight: 1.6,
        fontWeight: 600
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#334155"
      }
    }, ev.Source), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#94A3B8"
      }
    }, " (", getFnLabel(ev.SourceFunction, ev.Type === "3" || ev.Type === "4"), ")"), /*#__PURE__*/React.createElement("span", {
      style: {
        margin: "0 6px",
        color: "#0EA5E9"
      }
    }, "\\u2192"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#334155"
      }
    }, ev.Target), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#94A3B8"
      }
    }, " (", getFnLabel(ev.TargetFunction, ev.Type === "1" || ev.Type === "3"), ")"), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12
      }
    }, "Control: ", ev.SourceControl))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 800,
        padding: "3px 10px",
        borderRadius: 8,
        background: tInfo.bg,
        color: tInfo.color
      }
    }, tInfo.short), /*#__PURE__*/React.createElement("button", {
      onClick: () => removeEvent(i),
      style: {
        background: "none",
        border: "none",
        fontSize: 12,
        color: "#CBD5E1",
        cursor: "pointer",
        fontWeight: 700,
        padding: "2px 6px",
        fontFamily: "inherit"
      },
      onMouseEnter: e => e.target.style.color = "#EF4444",
      onMouseLeave: e => e.target.style.color = "#CBD5E1"
    }, "remove"))));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      background: "#F0FDF4",
      border: "2px solid #BBF7D0",
      borderRadius: 16,
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: "#065F46",
      marginBottom: 4
    }
  }, "Ready for StoryMakAR!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#047857",
      marginBottom: 16,
      fontWeight: 600
    }
  }, events.length, " event", events.length !== 1 ? "s" : "", " created. Download the file and load it in StoryMakAR."), /*#__PURE__*/React.createElement("button", {
    onClick: downloadJson,
    style: {
      width: "100%",
      padding: "14px",
      border: "none",
      borderRadius: 12,
      fontSize: 15,
      fontWeight: 800,
      fontFamily: "inherit",
      cursor: "pointer",
      background: "linear-gradient(135deg, #059669, #047857)",
      color: "#fff",
      boxShadow: "0 4px 16px rgba(5,150,105,0.3)",
      marginBottom: 10,
      transition: "all 0.2s"
    }
  }, "\\uD83D\\uDCBE  Download Events.txt"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowJson(!showJson),
    style: {
      flex: 1,
      padding: "10px",
      border: "2px solid #BBF7D0",
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit",
      cursor: "pointer",
      background: "#fff",
      color: "#047857",
      transition: "all 0.2s"
    }
  }, showJson ? "Hide JSON" : "Preview JSON"), /*#__PURE__*/React.createElement("button", {
    onClick: copyJson,
    style: {
      flex: 1,
      padding: "10px",
      border: "2px solid #BBF7D0",
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit",
      cursor: "pointer",
      background: "#fff",
      color: "#047857",
      transition: "all 0.2s"
    }
  }, copied ? "\u2705 Copied!" : "Copy JSON")), showJson && /*#__PURE__*/React.createElement("pre", {
    style: {
      marginTop: 12,
      background: "#1E293B",
      color: "#A7F3D0",
      padding: 16,
      borderRadius: 12,
      fontSize: 12,
      fontFamily: "'Courier New', monospace",
      overflow: "auto",
      maxHeight: 300,
      lineHeight: 1.5,
      whiteSpace: "pre-wrap",
      wordBreak: "break-all"
    }
  }, getJson())), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setEvents([]);
      showToast("All events cleared");
    },
    style: {
      width: "100%",
      padding: "12px",
      border: "2px solid #FEE2E2",
      borderRadius: 12,
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit",
      cursor: "pointer",
      background: "#FFF",
      color: "#DC2626",
      marginTop: 12,
      transition: "all 0.2s"
    }
  }, "Clear all events")), events.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px",
      color: "#94A3B8"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40,
      marginBottom: 8
    }
  }, "\uD83C\uDFAC"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 700,
      color: "#64748B"
    }
  }, "No events yet"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      marginTop: 4
    }
  }, "Create your first event to start building your story!")));
}