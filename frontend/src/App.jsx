import { useEffect, useRef, useState } from "react";
import "./style.css";
import { supabase } from "./supabase";

const DEVICE_ID =
  import.meta.env.VITE_DEVICE_ID || "WS301-868M";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:3001";

// =====================================================
// WARNING SETTINGS
// =====================================================

// Door must be open for this many seconds
// before the first warning.
const DEFAULT_WARNING_SECONDS = 20;

// Gap between each voice warning after the
// previous voice message has finished.
const WARNING_REPEAT_GAP_SECONDS = 2;

function App() {
  const [door, setDoor] = useState(null);
  const [events, setEvents] = useState([]);

  const [warningSeconds, setWarningSeconds] = useState(
    DEFAULT_WARNING_SECONDS
  );

  const [warningAudioUrl, setWarningAudioUrl] =
    useState("");

  const [openDuration, setOpenDuration] = useState(0);
  const [voiceEnabled, setVoiceEnabled] =
    useState(false);

  const audioRef = useRef(null);

  // Used to cancel the 5-second waiting period
  // when the door closes.
  const repeatTimerRef = useRef(null);

  // Used to stop the current warning cycle.
  const warningCycleRef = useRef(0);

  // =====================================================
  // LOAD WARNING CONFIGURATION FROM BACKEND
  // =====================================================

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/config`
        );

        if (!response.ok) {
          throw new Error(
            "Backend config request failed"
          );
        }

        const config = await response.json();

        console.log(
          "Backend config:",
          config
        );

        setWarningSeconds(
          Number(
            config.warningSeconds ||
              DEFAULT_WARNING_SECONDS
          )
        );

        setWarningAudioUrl(
          config.warningAudioUrl || ""
        );
      } catch (error) {
        console.error(
          "Config error:",
          error
        );

        setWarningSeconds(
          DEFAULT_WARNING_SECONDS
        );
      }
    }

    loadConfig();
  }, []);

  // =====================================================
  // LOAD CURRENT DOOR STATE
  // =====================================================

  async function loadDoorState() {
    const { data, error } =
      await supabase
        .from("door_state")
        .select("*")
        .eq("device_id", DEVICE_ID)
        .maybeSingle();

    if (error) {
      console.error(
        "Door state error:",
        error
      );
      return;
    }

    if (data) {
      setDoor(data);
    }
  }

  // =====================================================
  // LOAD DOOR HISTORY
  // =====================================================

  async function loadEvents() {
    const { data, error } =
      await supabase
        .from("door_events")
        .select("*")
        .eq("device_id", DEVICE_ID)
        .order("event_time", {
          ascending: false
        })
        .limit(20);

    if (error) {
      console.error(
        "Door events error:",
        error
      );
      return;
    }

    setEvents(data || []);
  }

  // =====================================================
  // INITIAL DATA LOAD
  // =====================================================

  useEffect(() => {
    loadDoorState();
    loadEvents();
  }, []);

  // =====================================================
  // SUPABASE REALTIME
  // =====================================================

  useEffect(() => {
    const channel = supabase
      .channel("door-state-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "door_state",
          filter: `device_id=eq.${DEVICE_ID}`
        },
        (payload) => {
          console.log(
            "Realtime update:",
            payload
          );

          if (payload.new) {
            setDoor(payload.new);
          }

          loadEvents();
        }
      )
      .subscribe((status) => {
        console.log(
          "Realtime status:",
          status
        );
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // =====================================================
  // CALCULATE DOOR OPEN DURATION
  // =====================================================

  useEffect(() => {
    if (
      !door ||
      door.status !== "open" ||
      !door.opened_at
    ) {
      setOpenDuration(0);
      return;
    }

    function updateDuration() {
      const openedTime =
        new Date(
          door.opened_at
        ).getTime();

      const currentTime =
        Date.now();

      const seconds = Math.max(
        0,
        Math.floor(
          (currentTime - openedTime) /
            1000
        )
      );

      setOpenDuration(seconds);
    }

    updateDuration();

    const timer = setInterval(
      updateDuration,
      1000
    );

    return () => {
      clearInterval(timer);
    };
  }, [door]);

  // =====================================================
  // WARNING CONDITION
  // =====================================================

  const warningActive =
    door?.status === "open" &&
    openDuration >= warningSeconds;

  // =====================================================
  // REPEATING WARNING AUDIO WITH 5 SECOND GAP
  // =====================================================

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    // Create a new cycle ID.
    // This allows us to cancel an old warning cycle.
    const currentCycle =
      warningCycleRef.current + 1;

    warningCycleRef.current =
      currentCycle;

    // Clear any previous 5-second timer.
    if (repeatTimerRef.current) {
      clearTimeout(
        repeatTimerRef.current
      );

      repeatTimerRef.current = null;
    }

    // If warning should not be active,
    // stop everything.
    if (
      !warningActive ||
      !voiceEnabled ||
      !warningAudioUrl
    ) {
      audio.pause();
      audio.currentTime = 0;

      return;
    }

    let stopped = false;

    // ===================================================
    // WAIT 5 SECONDS BEFORE PLAYING AGAIN
    // ===================================================

    function waitAndPlayAgain() {
      if (stopped) {
        return;
      }

      if (
        warningCycleRef.current !==
        currentCycle
      ) {
        return;
      }

      console.log(
        `Waiting ${WARNING_REPEAT_GAP_SECONDS} seconds before next warning...`
      );

      repeatTimerRef.current =
        setTimeout(() => {
          if (stopped) {
            return;
          }

          if (
            warningCycleRef.current !==
            currentCycle
          ) {
            return;
          }

          if (!warningActive) {
            return;
          }

          playWarning();
        }, WARNING_REPEAT_GAP_SECONDS * 1000);
    }

    // ===================================================
    // PLAY WARNING
    // ===================================================

    async function playWarning() {
      if (stopped) {
        return;
      }

      if (
        warningCycleRef.current !==
        currentCycle
      ) {
        return;
      }

      try {
        audio.src = warningAudioUrl;

        audio.currentTime = 0;

        await audio.play();

        console.log(
          "🔊 Warning audio playing"
        );
      } catch (error) {
        console.error(
          "Audio play error:",
          error
        );
      }
    }

    // ===================================================
    // WHEN AUDIO FINISHES
    // ===================================================

    function handleAudioEnded() {
      if (stopped) {
        return;
      }

      if (
        warningCycleRef.current !==
        currentCycle
      ) {
        return;
      }

      console.log(
        "🔊 Warning finished."
      );

      // Wait 5 seconds before next warning.
      waitAndPlayAgain();
    }

    // Listen for audio completion.
    audio.addEventListener(
      "ended",
      handleAudioEnded
    );

    // Start first warning immediately.
    playWarning();

    // ===================================================
    // CLEANUP
    // ===================================================

    return () => {
      stopped = true;

      audio.removeEventListener(
        "ended",
        handleAudioEnded
      );

      if (repeatTimerRef.current) {
        clearTimeout(
          repeatTimerRef.current
        );

        repeatTimerRef.current = null;
      }

      audio.pause();
      audio.currentTime = 0;
    };
  }, [
    warningActive,
    voiceEnabled,
    warningAudioUrl
  ]);

  // =====================================================
  // ENABLE VOICE
  // =====================================================

  async function enableVoice() {
    if (!warningAudioUrl) {
      alert(
        "Warning audio URL is not configured."
      );

      return;
    }

    try {
      const audio = audioRef.current;

      audio.src = warningAudioUrl;

      audio.currentTime = 0;

      await audio.play();

      audio.pause();

      audio.currentTime = 0;

      setVoiceEnabled(true);

      console.log(
        "🔊 Voice enabled"
      );
    } catch (error) {
      console.error(
        "Audio enable error:",
        error
      );

      alert(
        "Audio could not be played. Check your audio URL."
      );
    }
  }

  // =====================================================
  // FORMAT DURATION
  // =====================================================

  function formatDuration(seconds) {
    const minutes =
      Math.floor(seconds / 60);

    const remainingSeconds =
      seconds % 60;

    return `${minutes}m ${remainingSeconds
      .toString()
      .padStart(2, "0")}s`;
  }

  // =====================================================
  // FORMAT DATE
  // =====================================================

  function formatDate(date) {
    if (!date) {
      return "-";
    }

    return new Date(
      date
    ).toLocaleString();
  }

  const isOpen =
    door?.status === "open";

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="app">

      {/* HEADER */}

      <header className="header">

        <div>

          <h1>
            Door Monitoring System
          </h1>

          <p>
            Milesight WS301
          </p>

        </div>

        <div className="device">

          <span>
            Device
          </span>

          <strong>
            {DEVICE_ID}
          </strong>

        </div>

      </header>

      {/* VOICE SECTION */}

      <div className="voice-section">

        <button
          className={
            voiceEnabled
              ? "voice-button enabled"
              : "voice-button"
          }
          onClick={enableVoice}
        >
          {voiceEnabled
            ? "🔊 Voice Enabled"
            : "🔊 Enable Voice"}
        </button>

        <span>
          Warning after{" "}
          <strong>
            {warningSeconds} seconds
          </strong>
        </span>

        <span>
          Repeat gap{" "}
          <strong>
            {WARNING_REPEAT_GAP_SECONDS} seconds
          </strong>
        </span>

      </div>

      {/* WARNING CARD */}

      {warningActive && (

        <div className="warning-card">

          <div className="warning-icon">
            ⚠️
          </div>

          <div>

            <h2>
              Door Open Too Long
            </h2>

            <p>
              Please close the door
            </p>

            <strong>
              Open for{" "}
              {formatDuration(
                openDuration
              )}
            </strong>

          </div>

        </div>

      )}

      {/* MAIN DASHBOARD */}

      <main className="dashboard">

        {/* CURRENT STATUS */}

        <section
          className={
            isOpen
              ? "status-card open"
              : "status-card closed"
          }
        >

          <div className="status-icon">
            {isOpen
              ? "🚪"
              : "🔒"}
          </div>

          <div>

            <h2>
              {isOpen
                ? "DOOR OPEN"
                : "DOOR CLOSED"}
            </h2>

            {isOpen ? (

              <p>
                Open for{" "}
                <strong>
                  {formatDuration(
                    openDuration
                  )}
                </strong>
              </p>

            ) : (

              <p>
                The door is currently
                closed.
              </p>

            )}

          </div>

        </section>

        {/* INFORMATION CARDS */}

        <div className="info-grid">

          <div className="info-card">

            <h3>
              Battery
            </h3>

            <div className="info-value">

              {door?.battery !== null &&
              door?.battery !== undefined
                ? `${door.battery}%`
                : "-"}

            </div>

          </div>

          <div className="info-card">

            <h3>
              Tamper Status
            </h3>

            <div className="info-value">

              {door?.tamper_status ||
                "-"}

            </div>

          </div>

          <div className="info-card">

            <h3>
              Last Opened
            </h3>

            <div className="info-small">

              {formatDate(
                door?.last_opened_at
              )}

            </div>

          </div>

          <div className="info-card">

            <h3>
              Last Closed
            </h3>

            <div className="info-small">

              {formatDate(
                door?.last_closed_at
              )}

            </div>

          </div>

        </div>

        {/* HISTORY */}

        <section className="history-section">

          <h2>
            Door History
          </h2>

          {events.length === 0 ? (

            <p className="no-data">
              No door events found.
            </p>

          ) : (

            <div className="table-container">

              <table>

                <thead>

                  <tr>

                    <th>
                      Time
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Duration
                    </th>

                    <th>
                      Battery
                    </th>

                    <th>
                      Tamper
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {events.map(
                    (event) => (

                      <tr
                        key={event.id}
                      >

                        <td>
                          {formatDate(
                            event.event_time
                          )}
                        </td>

                        <td>

                          <span
                            className={
                              event.status ===
                              "open"
                                ? "badge open-badge"
                                : "badge closed-badge"
                            }
                          >
                            {event.status}
                          </span>

                        </td>

                        <td>

                          {event.duration_seconds !==
                            null &&
                          event.duration_seconds !==
                            undefined
                            ? `${event.duration_seconds}s`
                            : "-"}

                        </td>

                        <td>

                          {event.battery !==
                            null &&
                          event.battery !==
                            undefined
                            ? `${event.battery}%`
                            : "-"}

                        </td>

                        <td>
                          {event.tamper_status ||
                            "-"}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

      </main>

      {/* AUDIO */}

      <audio
        ref={audioRef}
        preload="auto"
      />

    </div>
  );
}

export default App;