import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Globe,
  Wifi,
  UtensilsCrossed,
  Droplets,
  Wrench,
  Zap,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  ChevronDown,
  ChevronUp,
  Terminal,
  Plus,
  X,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Check,
  ServerCrash,
  Search,
  UserCheck,
  Send
} from 'lucide-react';

// ============================================================================
// ANIMATION VARIANTS (Fast, subtle 150-300ms transitions)
// ============================================================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] }
  }
};

// ============================================================================
// COUNT-UP ANIMATED NUMBER COMPONENT
// ============================================================================
const CountUp = ({ value, duration = 400 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10) || 0;
    if (start === end) {
      setCount(end);
      return;
    }

    const totalSteps = 16;
    const stepTime = Math.max(10, Math.floor(duration / totalSteps));
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / totalSteps;
      const currentVal = Math.round(start + (end - start) * progress);
      setCount(currentVal);

      if (currentStep >= totalSteps) {
        clearInterval(timer);
        setCount(end);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}</span>;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

export const HeaderBar = ({ userProfile, onReset }) => (
  <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
    <div className="flex items-start gap-3.5">
      <div className="relative mt-1">
        <span className="flex h-3 w-3 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
      </div>
      <div>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
          Hostel Maintenance &amp; Facilities Console
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Logged in as <strong className="text-slate-700 font-medium">{userProfile.name}</strong> ({userProfile.role || 'Hostel Authority'}) · Real-time departmental triage
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onReset}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 hover:text-slate-900 border border-slate-200 rounded-xl transition-colors shadow-sm"
      >
        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
        Reset State
      </motion.button>
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-medium shadow-sm">
        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
        <span>{userProfile.deptLabel || 'Operations Authority'}</span>
      </div>
    </div>
  </header>
);

export const DemoScenarioButton = ({ scenario, isSelected, onClick }) => {
  const Icon = scenario.icon;
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick(scenario.id)}
      className={`relative flex items-center gap-3 p-3.5 rounded-2xl text-left border transition-all duration-200 ${
        isSelected
          ? 'bg-white border-slate-900 shadow-md ring-1 ring-slate-900/10'
          : 'bg-white/80 hover:bg-white border-slate-200/90 hover:border-slate-300 shadow-sm'
      }`}
    >
      <div className={`p-2.5 rounded-xl ${scenario.iconBg}`}>
        <Icon className={`w-4 h-4 ${scenario.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs font-semibold text-slate-900 truncate">{scenario.title}</p>
          {isSelected && <span className="flex h-1.5 w-1.5 rounded-full bg-slate-900" />}
        </div>
        <p className="text-[11px] text-slate-500 truncate mt-0.5">{scenario.subtitle}</p>
      </div>
    </motion.button>
  );
};

export const StatCard = ({ label, value, icon: Icon, colorTheme }) => {
  const themeClasses = {
    blue: { bg: 'bg-sky-50', text: 'text-sky-600' },
    red: { bg: 'bg-rose-50', text: 'text-rose-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-600' }
  }[colorTheme] || { bg: 'bg-slate-50', text: 'text-slate-600' };

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 tracking-wide uppercase">{label}</span>
        <div className={`p-2 rounded-xl ${themeClasses.bg} ${themeClasses.text}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3">
        <span className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
          <CountUp value={value} />
        </span>
      </div>
    </motion.div>
  );
};

export const DepartmentTab = ({ dept, isSelected, onClick }) => {
  const Icon = dept.icon;
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick(dept.id)}
      className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors shrink-0 z-10 ${
        isSelected ? 'text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
      }`}
    >
      {isSelected && (
        <motion.div
          layoutId="activeDeptPill"
          className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/80 -z-10"
          transition={{ type: 'spring', stiffness: 450, damping: 35 }}
        />
      )}
      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-900' : 'text-slate-400'}`} />
      <span>{dept.label}</span>
      <span
        className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-md font-mono transition-colors ${
          isSelected ? 'bg-slate-100 text-slate-900 font-bold' : 'bg-slate-100/70 text-slate-500'
        }`}
      >
        {dept.count}
      </span>
    </motion.button>
  );
};

// ============================================================================
// DEDICATED DIGITAL RECOVERY LAB COMPONENT
// ============================================================================
export const DigitalSelfHealingLab = ({
  serviceHealth,
  onInjectOutage,
  onRunSandbox,
  onApprove,
  onExecuteRecovery,
  sandboxPassed,
  approvalGranted,
  isRecovering,
  logs
}) => {
  const isDown = serviceHealth.websiteService === 'down';
  const isHealthy = serviceHealth.websiteService === 'healthy';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              Controlled Digital AIOps Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">Port 8080 · Cluster Web-01</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            Campus Web Service &amp; ERP Self-Healing Lab
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Autonomous fault detection, sandboxed staging dry-run rehearsal, authority sign-off gate, and live HTTP GET probe verification.
          </p>
        </div>

        {/* Live Service Health Status Pill */}
        <div className="shrink-0 flex items-center gap-2.5 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700/80 shadow-inner">
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isHealthy ? 'bg-emerald-400' : 'bg-rose-400'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${
              isHealthy ? 'bg-emerald-500' : 'bg-rose-500'
            }`}></span>
          </span>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Live Probe State
            </span>
            <span className={`text-xs font-bold font-mono ${
              isHealthy ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {isHealthy ? 'HTTP 200 OK (Healthy)' : 'HTTP 503 Outage'}
            </span>
          </div>
        </div>
      </div>

      {/* 4-Step Visual Journey Pipeline */}
      <div className="p-5 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          
          {/* Step 1: Detect Outage */}
          <div className={`p-4 rounded-xl border transition-all ${
            isDown
              ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200'
              : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">01. FAULT PROBE</span>
              {isDown && <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />}
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-1">Outage Detection</h4>
            <p className="text-[11px] text-slate-600 leading-snug">
              {isDown ? 'HTTP GET /healthz failed (Socket pool exhausted)' : 'Continuous daemon probe listening.'}
            </p>
            <div className="mt-3">
              <button
                onClick={onInjectOutage}
                disabled={isDown}
                className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isDown
                    ? 'bg-rose-200 text-rose-800 opacity-60 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                }`}
              >
                {isDown ? '💥 Outage Active' : '💥 1. Inject Outage (503)'}
              </button>
            </div>
          </div>

          {/* Step 2: Sandbox Testing */}
          <div className={`p-4 rounded-xl border transition-all ${
            sandboxPassed
              ? 'bg-emerald-50/70 border-emerald-300'
              : isDown
              ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-200'
              : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">02. SANDBOX DRY-RUN</span>
              {sandboxPassed ? (
                <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> Passed
                </span>
              ) : isDown ? (
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              ) : null}
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-1">Staging Rehearsal</h4>
            <p className="text-[11px] text-slate-600 leading-snug">
              {sandboxPassed ? '4/4 pre-flight replica assertions passed.' : 'Test container replica without risking production.'}
            </p>
            <div className="mt-3">
              <button
                onClick={onRunSandbox}
                disabled={!isDown || sandboxPassed}
                className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                  sandboxPassed
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : isDown
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {sandboxPassed ? '🧪 Rehearsal PASSED' : '🧪 2. Run Sandbox Test'}
              </button>
            </div>
          </div>

          {/* Step 3: Authority Approval Gate */}
          <div className={`p-4 rounded-xl border transition-all ${
            approvalGranted
              ? 'bg-emerald-50/70 border-emerald-300'
              : sandboxPassed
              ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-200'
              : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">03. GOVERNANCE GATE</span>
              {approvalGranted ? (
                <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> Signed
                </span>
              ) : sandboxPassed ? (
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              ) : null}
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-1">Authority Approval</h4>
            <p className="text-[11px] text-slate-600 leading-snug">
              {approvalGranted ? 'Authorized by Chief Warden & IT Lead.' : 'High-impact safeguard prevents unverified restarts.'}
            </p>
            <div className="mt-3">
              <button
                onClick={onApprove}
                disabled={!sandboxPassed || approvalGranted}
                className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                  approvalGranted
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : sandboxPassed
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {approvalGranted ? '✍️ Sign-off Granted' : '✍️ 3. Grant Approval'}
              </button>
            </div>
          </div>

          {/* Step 4: Live Recovery & Verification Probe */}
          <div className={`p-4 rounded-xl border transition-all ${
            isHealthy && !isDown
              ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-200'
              : approvalGranted
              ? 'bg-slate-900 text-white border-slate-900 ring-1 ring-slate-800'
              : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">04. RECOVERY &amp; PROBE</span>
              {isHealthy && !isDown ? (
                <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 200 OK
                </span>
              ) : approvalGranted ? (
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              ) : null}
            </div>
            <h4 className={`text-xs font-bold mb-1 ${approvalGranted ? 'text-white' : 'text-slate-900'}`}>
              Live Restart &amp; Probe
            </h4>
            <p className={`text-[11px] leading-snug ${approvalGranted ? 'text-slate-300' : 'text-slate-600'}`}>
              {isHealthy && !isDown ? 'Restoration verified via live HTTP probe (14ms).' : 'Execute container restart and verify recovery.'}
            </p>
            <div className="mt-3">
              <button
                onClick={onExecuteRecovery}
                disabled={!approvalGranted || (isHealthy && !isDown) || isRecovering}
                className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isHealthy && !isDown
                    ? 'bg-emerald-600 text-white'
                    : approvalGranted
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold shadow-md animate-pulse'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isRecovering ? '⚡ Executing Probe...' : isHealthy && !isDown ? '✅ Verified Healthy' : '⚡ 4. Execute Live Recovery'}
              </button>
            </div>
          </div>

        </div>

        {/* Live Terminal Streaming Log Strip */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-500" />
              Real-Time AIOps Diagnostic &amp; Verification Stream
            </span>
            <span className="text-[11px] text-slate-400 font-mono">http://campus.edu:8080/healthz</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs space-y-1.5 max-h-48 overflow-y-auto shadow-inner border border-slate-800">
            {logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2.5 leading-relaxed">
                <span className="text-slate-500 select-none text-[11px]">[{log.time}]</span>
                <span className={
                  log.type === 'error' ? 'text-rose-400 font-medium' :
                  log.type === 'sandbox' ? 'text-indigo-300' :
                  log.type === 'approval' ? 'text-amber-300 font-medium' :
                  log.type === 'success' ? 'text-emerald-400 font-bold' :
                  'text-slate-300'
                }>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN HOSTEL MAINTENANCE CONSOLE COMPONENT
// ============================================================================
export default function HostelMaintenanceConsole() {
  const [userProfile, setUserProfile] = useState({
    name: 'Er. Ramesh K. Sharma',
    role: 'Hostel Authority',
    dept: 'hostel',
    deptLabel: 'Hostel Maintenance & Facilities'
  });

  const SCENARIOS = [
    { id: 'web_outage', title: 'Web Outage', subtitle: 'Digital Self-Healing', icon: ServerCrash, iconBg: 'bg-rose-50', iconColor: 'text-rose-600', dept: 'it' },
    { id: 'wifi_surge', title: 'Wi-Fi Surge', subtitle: '5 Clustered Reports', icon: Wifi, iconBg: 'bg-sky-50', iconColor: 'text-sky-600', dept: 'it' },
    { id: 'food_safety', title: 'Mess Food Alert', subtitle: 'P1 Safety Escalation', icon: UtensilsCrossed, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', dept: 'mess' },
    { id: 'water_hazard', title: 'Water Contamination', subtitle: 'Civil Work Order', icon: Droplets, iconBg: 'bg-cyan-50', iconColor: 'text-cyan-600', dept: 'hostel' }
  ];

  const [selectedScenario, setSelectedScenario] = useState('web_outage');
  const [selectedDept, setSelectedDept] = useState('all');
  const [expandedIssueId, setExpandedIssueId] = useState(null);
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false);

  // Digital Lab Workflow States
  const [serviceHealth, setServiceHealth] = useState({ websiteService: 'healthy', httpStatusCode: 200 });
  const [sandboxPassed, setSandboxPassed] = useState(false);
  const [approvalGranted, setApprovalGranted] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [digitalLogs, setDigitalLogs] = useState([
    { time: '10:00:02', type: 'info', message: '[PROBE DAEMON] Monitoring http://campus.edu:8080/healthz (200 OK | Latency: 12ms)' },
    { time: '10:00:15', type: 'info', message: '[SOCKET POOL] Active connections: 24/50 DB sockets healthy.' }
  ]);

  // Physical Issues
  const [issues, setIssues] = useState([
    {
      id: 'INC-1042',
      title: 'Hostel A Wi-Fi Access Point Degradation',
      category: 'network',
      isDigital: false,
      department: 'it',
      departmentLabel: 'IT & Network Operations',
      officer: 'Debashish Roy (NOC Lead)',
      location: 'Hostel A (3rd Floor Wing)',
      priority: 'P2 - High',
      priorityReason: '5 correlated student complaints clustered in Hostel A within 10 minutes.',
      status: 'Action in Progress',
      description: 'Intermittent packet drops and Wi-Fi disconnects on switch SW-HostelA.',
      isUrgentSafety: false,
      correlatedCount: 5,
      currentStepIndex: 2,
      createdAt: new Date(Date.now() - 12 * 60000).toISOString()
    },
    {
      id: 'INC-1043',
      title: 'Food Quality & Dining Hygiene Alert',
      category: 'food_safety',
      isDigital: false,
      department: 'mess',
      departmentLabel: 'Mess & Food Safety Authority',
      officer: 'Dr. Ananya Sen (Food Safety Officer)',
      location: 'Central Dining Hall (Counter 2)',
      priority: 'P1 - Critical',
      priorityReason: 'Potential food contamination concern with nausea reports.',
      status: 'Under Investigation',
      description: 'Student reported sour odor in Tuesday dinner service. Food sample preservation requested.',
      isUrgentSafety: true,
      correlatedCount: 1,
      currentStepIndex: 1,
      createdAt: new Date(Date.now() - 25 * 60000).toISOString()
    },
    {
      id: 'INC-1044',
      title: 'Potable Drinking Water Discoloration',
      category: 'water',
      isDigital: false,
      department: 'hostel',
      departmentLabel: 'Facilities & Civil Works',
      officer: 'Er. S. Murthy (Water Superintendent)',
      location: 'Hostel BH-2 (1st Floor Cooler)',
      priority: 'P2 - High',
      priorityReason: 'Potable water quality hazard affecting floor residents.',
      status: 'Assigned',
      description: 'Discolored brown water flowing from main water cooler unit with sulfur odor.',
      isUrgentSafety: false,
      correlatedCount: 1,
      currentStepIndex: 0,
      createdAt: new Date(Date.now() - 40 * 60000).toISOString()
    }
  ]);

  // Digital Outage Trigger
  const handleInjectOutage = () => {
    setServiceHealth({ websiteService: 'down', httpStatusCode: 503 });
    setSandboxPassed(false);
    setApprovalGranted(false);
    setDigitalLogs(prev => [
      ...prev,
      { time: new Date().toLocaleTimeString(), type: 'error', message: '🚨 [CRITICAL OUTAGE] HTTP GET /healthz returned 503 Service Unavailable (Container socket crash).' }
    ]);
  };

  const handleRunSandbox = async () => {
    const time = new Date().toLocaleTimeString();
    setDigitalLogs(prev => [
      ...prev,
      { time, type: 'sandbox', message: '🧪 [SANDBOX TEST] Initializing isolated container replica on port 8089...' }
    ]);

    await new Promise(r => setTimeout(r, 600));

    const time2 = new Date().toLocaleTimeString();
    setSandboxPassed(true);
    setDigitalLogs(prev => [
      ...prev,
      { time: time2, type: 'sandbox', message: '✅ [SANDBOX PASSED] 4/4 assertions valid: DB Pool reset OK, reverse proxy route verified, 0 errors on replica.' }
    ]);
  };

  const handleGrantApproval = () => {
    const time = new Date().toLocaleTimeString();
    setApprovalGranted(true);
    setDigitalLogs(prev => [
      ...prev,
      { time, type: 'approval', message: `✍️ [GOVERNANCE SIGN-OFF] Authorized by ${userProfile.name} (Chief Warden / IT Authority) for production container live restart.` }
    ]);
  };

  const handleExecuteRecovery = async () => {
    setIsRecovering(true);
    const time = new Date().toLocaleTimeString();
    setDigitalLogs(prev => [
      ...prev,
      { time, type: 'info', message: '⚡ [RECOVERY INITIATED] Restarting production container "campus-web-prod" and flushing stale socket pool...' }
    ]);

    await new Promise(r => setTimeout(r, 800));

    setIsRecovering(false);
    setServiceHealth({ websiteService: 'healthy', httpStatusCode: 200 });
    setSandboxPassed(false);
    setApprovalGranted(false);
    const time2 = new Date().toLocaleTimeString();
    setDigitalLogs(prev => [
      ...prev,
      { time: time2, type: 'success', message: '✅ [VERIFIED 200 OK] Live HTTP GET /healthz probe returned 200 OK (Latency: 14ms | Measured MTTR: 2.4s). Web service fully restored!' }
    ]);
  };

  const handleScenarioSelect = (scenarioId) => {
    setSelectedScenario(scenarioId);
    const sc = SCENARIOS.find(s => s.id === scenarioId);
    if (sc) setSelectedDept(sc.dept);

    if (scenarioId === 'web_outage') {
      handleInjectOutage();
    }
  };

  const handlePhysicalStatusUpdate = (issueId, newStatus) => {
    setIssues(prev => prev.map(item => {
      if (item.id !== issueId) return item;
      let nextStep = item.currentStepIndex;
      if (newStatus === 'Under Investigation') nextStep = 1;
      else if (newStatus === 'Action in Progress') nextStep = 2;
      else if (newStatus === 'Resolved' || newStatus === 'Verified / Closed') nextStep = 3;
      return {
        ...item,
        status: newStatus,
        currentStepIndex: nextStep
      };
    }));
  };

  const handleReset = () => {
    setSelectedScenario('web_outage');
    setSelectedDept('all');
    setServiceHealth({ websiteService: 'healthy', httpStatusCode: 200 });
    setSandboxPassed(false);
    setApprovalGranted(false);
    setDigitalLogs([
      { time: new Date().toLocaleTimeString(), type: 'info', message: '[SYSTEM RESET] Campus baseline restored to Healthy state.' }
    ]);
  };

  const filteredIssues = useMemo(() => {
    if (selectedDept === 'all') return issues;
    if (selectedDept === 'admin') {
      return issues.filter(i => i.isUrgentSafety || i.priority?.includes('Critical') || i.priority?.includes('High'));
    }
    return issues.filter(i => i.department === selectedDept);
  }, [issues, selectedDept]);

  const activeCount = issues.filter(i => !['Resolved', 'Verified / Closed'].includes(i.status)).length + (serviceHealth.websiteService === 'down' ? 1 : 0);
  const highPriorityCount = issues.filter(i => (i.priority?.includes('Critical') || i.priority?.includes('High') || i.isUrgentSafety) && !['Resolved', 'Verified / Closed'].includes(i.status)).length + (serviceHealth.websiteService === 'down' ? 1 : 0);
  const inProgressCount = issues.filter(i => ['Action in Progress', 'Under Investigation'].includes(i.status)).length;
  const resolvedTodayCount = issues.filter(i => ['Resolved', 'Verified / Closed'].includes(i.status)).length + (serviceHealth.websiteService === 'healthy' ? 1 : 0);

  const DEPARTMENTS = [
    { id: 'all', label: 'All Departments', icon: Activity, count: issues.length + 1 },
    { id: 'it', label: 'IT & Network', icon: Globe, count: issues.filter(i => i.department === 'it').length + 1 },
    { id: 'hostel', label: 'Hostel & Facilities', icon: Wrench, count: issues.filter(i => i.department === 'hostel').length },
    { id: 'mess', label: 'Mess & Food Safety', icon: UtensilsCrossed, count: issues.filter(i => i.department === 'mess').length },
    { id: 'admin', label: 'Campus Administration', icon: ShieldCheck, count: issues.filter(i => i.isUrgentSafety || i.priority?.includes('Critical') || i.priority?.includes('High')).length }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans p-4 sm:p-6 lg:p-8">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <motion.div variants={itemVariants}>
          <HeaderBar userProfile={userProfile} onReset={handleReset} />
        </motion.div>

        {/* 1-Click Demo Scenarios */}
        <motion.section variants={itemVariants} className="bg-slate-100/70 p-5 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">1-Click Demo Scenarios</span>
              <span className="text-xs text-slate-400">· Real Inputs &amp; Live Logic</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-white text-slate-600 border border-slate-200 shadow-2xs">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Instant Test Triggers
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SCENARIOS.map(sc => (
              <DemoScenarioButton
                key={sc.id}
                scenario={sc}
                isSelected={selectedScenario === sc.id}
                onClick={handleScenarioSelect}
              />
            ))}
          </div>
        </motion.section>

        {/* 4 Stat KPI Cards */}
        <motion.section variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Complaints" value={activeCount} icon={Inbox} colorTheme="blue" />
          <StatCard label="High / Critical Priority" value={highPriorityCount} icon={AlertCircle} colorTheme="red" />
          <StatCard label="Action in Progress" value={inProgressCount} icon={Clock} colorTheme="amber" />
          <StatCard label="Resolved Today" value={resolvedTodayCount} icon={CheckCircle2} colorTheme="green" />
        </motion.section>

        {/* DIGITAL RECOVERY LAB */}
        <motion.div variants={itemVariants}>
          <DigitalSelfHealingLab
            serviceHealth={serviceHealth}
            onInjectOutage={handleInjectOutage}
            onRunSandbox={handleRunSandbox}
            onApprove={handleGrantApproval}
            onExecuteRecovery={handleExecuteRecovery}
            sandboxPassed={sandboxPassed}
            approvalGranted={approvalGranted}
            isRecovering={isRecovering}
            logs={digitalLogs}
          />
        </motion.div>

        {/* Department Filter Tabs */}
        <motion.nav variants={itemVariants} className="bg-slate-200/60 p-1.5 rounded-2xl border border-slate-200 flex items-center gap-1 overflow-x-auto">
          {DEPARTMENTS.map(dept => (
            <DepartmentTab
              key={dept.id}
              dept={dept}
              isSelected={selectedDept === dept.id}
              onClick={setSelectedDept}
            />
          ))}
        </motion.nav>

        {/* Assigned Issues List */}
        <motion.section variants={itemVariants} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Physical Facilities &amp; Departmental Triage Feed ({DEPARTMENTS.find(d => d.id === selectedDept)?.label || 'All'})
              </h2>
              <p className="text-xs text-slate-500">
                Hostel maintenance, plumbing, electrical, and food safety issues dispatched to responsible authorities with SLA tracking.
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsNewReportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Submit Test Report</span>
            </motion.button>
          </div>

          <div className="space-y-3">
            {filteredIssues.map(issue => {
              const isExpanded = expandedIssueId === issue.id;
              const isSafety = issue.isUrgentSafety || issue.priority?.includes('Critical') || issue.category === 'food_safety';
              const activeStepIndex = issue.currentStepIndex || 0;

              const physicalSteps = [
                { id: 1, label: '1. Intake & Routing' },
                { id: 2, label: '2. On-Site Inspection' },
                { id: 3, label: '3. Action & Part Repair' },
                { id: 4, label: '4. Quality Verification & Closure' }
              ];

              return (
                <article
                  key={issue.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isExpanded
                      ? 'border-slate-300 shadow-md ring-1 ring-slate-200'
                      : 'border-slate-200/80 hover:border-slate-300 shadow-sm hover:shadow'
                  }`}
                >
                  {/* Header Bar */}
                  <div
                    onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                    className="p-5 sm:p-6 cursor-pointer select-none flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 sm:mt-0 ${
                        isSafety ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {issue.category === 'network' ? <Wifi className="w-4 h-4" /> : issue.category === 'food_safety' ? <UtensilsCrossed className="w-4 h-4" /> : issue.category === 'water' ? <Droplets className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isSafety ? 'bg-rose-100/70 text-rose-800' : 'bg-amber-100/70 text-amber-800'
                          }`}>
                            {isSafety ? '⚠️ SAFETY ESCALATION' : '🏢 HARDWARE / FACILITIES'}
                          </span>
                          <h3 className="text-sm font-semibold text-slate-900 truncate">
                            {issue.title}
                          </h3>
                          <span className="font-mono text-xs text-slate-400">#{issue.id}</span>
                          {issue.correlatedCount > 1 && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                              ⚡ {issue.correlatedCount} Correlated Reports
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                          <span>📍 {issue.location}</span>
                          <span>•</span>
                          <span>🏢 Assigned: <strong className="text-slate-700 font-medium">{issue.departmentLabel}</strong> ({issue.officer})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        issue.priority?.includes('Critical') || issue.isUrgentSafety
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : issue.priority?.includes('High')
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {issue.priority}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-slate-100 text-slate-700 border-slate-200">
                        {issue.status}
                      </span>
                      <div className="p-1 rounded-lg text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Body */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-slate-100 px-5 pb-5 sm:px-6 sm:pb-6 pt-4 space-y-4 bg-slate-50/50"
                      >
                        {/* Description */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-2">
                          <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                              Problem Description &amp; Resident Intake
                            </span>
                            <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
                              {issue.description}
                            </p>
                          </div>
                          {issue.priorityReason && (
                            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span><strong>Decision Rule &amp; Priority:</strong> {issue.priorityReason}</span>
                            </div>
                          )}
                        </div>

                        {/* Safety Warning */}
                        {issue.isUrgentSafety && (
                          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>
                                <strong>⚠️ Urgent Human Response Required:</strong> On-site safety inspection dispatched to <strong>{issue.officer}</strong>.
                              </span>
                            </div>
                            <span className="px-2 py-0.5 bg-rose-200/60 rounded text-[10px] font-mono font-bold text-rose-900">
                              SLA: &lt;15 mins
                            </span>
                          </div>
                        )}

                        {/* Work Order Info */}
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-4 flex-wrap">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Official Departmental Work Order</span>
                            <p className="font-semibold text-slate-800">
                              🏢 {issue.departmentLabel} · Lead: <strong>{issue.officer}</strong>
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-slate-400 block">Dispatch SLA</span>
                            <span className="font-semibold text-slate-700">30-45 mins</span>
                          </div>
                        </div>

                        {/* Stepper */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              Physical Maintenance &amp; Verification Lifecycle
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              Step {activeStepIndex + 1} of 4
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            {physicalSteps.map((step, idx) => {
                              const isComplete = idx < activeStepIndex;
                              const isActive = idx === activeStepIndex;
                              return (
                                <div
                                  key={step.id}
                                  className={`flex-1 min-w-[130px] p-2.5 rounded-xl border transition-all ${
                                    isActive
                                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                      : isComplete
                                      ? 'bg-emerald-50/70 text-emerald-900 border-emerald-200/70'
                                      : 'bg-slate-50 text-slate-500 border-slate-200/60 hover:bg-slate-100/60'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 mb-1">
                                    {isComplete ? (
                                      <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                                      </div>
                                    ) : isActive ? (
                                      <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400"></span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-mono opacity-60">#{idx + 1}</span>
                                    )}
                                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                                      Step {idx + 1}
                                    </span>
                                  </div>
                                  <p className="text-xs font-semibold truncate">{step.label}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Redesigned Prominent Authority Governance & Action Dispatch Section */}
                        <div className="mt-3 bg-gradient-to-b from-slate-900/[0.04] to-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-4">
                          {/* Header & Status Indicator */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200/80">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-xl bg-slate-900 text-white shadow-xs">
                                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                                    Authority Command &amp; Action Dispatch
                                  </h4>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                    Warden Duty Gate
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Execute progressive departmental triage and official verification sign-off
                                </p>
                              </div>
                            </div>

                            {/* Live Status Badge */}
                            <div className="flex items-center gap-1.5 self-start sm:self-auto">
                              <span className="text-[11px] text-slate-400 font-medium">Current Status:</span>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-2xs ${
                                st.includes('closed') || st.includes('verified')
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : st.includes('resolved')
                                  ? 'bg-teal-50 text-teal-800 border-teal-300'
                                  : st.includes('progress')
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : st.includes('investigat')
                                  ? 'bg-purple-50 text-purple-800 border-purple-300'
                                  : 'bg-sky-50 text-sky-800 border-sky-300'
                              }`}>
                                <span className={`w-2 h-2 rounded-full ${
                                  st.includes('closed') || st.includes('verified') ? 'bg-emerald-500' :
                                  st.includes('resolved') ? 'bg-teal-500' :
                                  st.includes('progress') ? 'bg-amber-500 animate-pulse' :
                                  st.includes('investigat') ? 'bg-purple-500 animate-pulse' : 'bg-sky-500'
                                }`} />
                                {issue.status}
                              </span>
                            </div>
                          </div>

                          {/* 4 Prominent Authority Action Buttons */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                            {/* 1. Investigate */}
                            <motion.button
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={() => handlePhysicalStatusUpdate(issue.id, 'Under Investigation')}
                              className={`group relative p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between gap-2 ${
                                st.includes('investigat')
                                  ? 'bg-purple-50/90 border-purple-400 ring-2 ring-purple-400/30 shadow-sm'
                                  : 'bg-white hover:bg-purple-50/40 border-slate-200/90 hover:border-purple-300 shadow-2xs hover:shadow-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 w-full">
                                <div className={`p-1.5 rounded-lg ${st.includes('investigat') ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700 group-hover:bg-purple-200'}`}>
                                  <Search className="w-3.5 h-3.5" />
                                </div>
                                {st.includes('investigat') && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-200 text-purple-900">
                                    Active
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 group-hover:text-purple-900">
                                  1. Investigate
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                                  Assign on-site inspection
                                </p>
                              </div>
                            </motion.button>

                            {/* 2. Start Action / Dispatch */}
                            <motion.button
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={() => handlePhysicalStatusUpdate(issue.id, 'Action in Progress')}
                              className={`group relative p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between gap-2 ${
                                st.includes('progress')
                                  ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/30 shadow-sm'
                                  : 'bg-white hover:bg-amber-50/40 border-slate-200/90 hover:border-amber-300 shadow-2xs hover:shadow-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 w-full">
                                <div className={`p-1.5 rounded-lg ${st.includes('progress') ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700 group-hover:bg-amber-200'}`}>
                                  <Wrench className="w-3.5 h-3.5" />
                                </div>
                                {st.includes('progress') && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900">
                                    In Field
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 group-hover:text-amber-900">
                                  2. Dispatch Team
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                                  Start repair &amp; parts work
                                </p>
                              </div>
                            </motion.button>

                            {/* 3. Mark Resolved */}
                            <motion.button
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={() => handlePhysicalStatusUpdate(issue.id, 'Resolved')}
                              className={`group relative p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between gap-2 ${
                                st.includes('resolved') && !st.includes('closed')
                                  ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/30 shadow-sm'
                                  : 'bg-white hover:bg-emerald-50/40 border-slate-200/90 hover:border-emerald-300 shadow-2xs hover:shadow-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 w-full">
                                <div className={`p-1.5 rounded-lg ${st.includes('resolved') && !st.includes('closed') ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200'}`}>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </div>
                                {st.includes('resolved') && !st.includes('closed') && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900">
                                    Fixed
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                                  3. Mark Resolved
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                                  Field technician completed
                                </p>
                              </div>
                            </motion.button>

                            {/* 4. Verify & Official Close */}
                            <motion.button
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={() => handlePhysicalStatusUpdate(issue.id, 'Verified / Closed')}
                              className={`group relative p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between gap-2 ${
                                st.includes('closed') || st.includes('verified')
                                  ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-800 shadow-sm'
                                  : 'bg-white hover:bg-slate-900 hover:text-white border-slate-200/90 hover:border-slate-900 shadow-2xs hover:shadow-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 w-full">
                                <div className={`p-1.5 rounded-lg ${st.includes('closed') || st.includes('verified') ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white'}`}>
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                </div>
                                {(st.includes('closed') || st.includes('verified')) && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-400 text-slate-950">
                                    Closed ✓
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className={`text-xs font-bold ${st.includes('closed') || st.includes('verified') ? 'text-white' : 'text-slate-900 group-hover:text-white'}`}>
                                  4. Verify &amp; Close
                                </div>
                                <p className={`text-[10px] mt-0.5 leading-tight ${st.includes('closed') || st.includes('verified') ? 'text-slate-300' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                  Warden executive sign-off
                                </p>
                              </div>
                            </motion.button>
                          </div>

                          {/* Authority Sign-Off Audit & Guidance Strip */}
                          <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span>
                                Duty Approver: <strong className="text-slate-700">{userProfile.name}</strong> ({userProfile.role || 'Hostel Authority'})
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-400">
                              Audit Trail: Logged to Immutable Ledger
                            </span>
                          </div>
                        </div>

                      </motion.div>
                    )}
                  </AnimatePresence>
                </article>
              );
            })}
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
