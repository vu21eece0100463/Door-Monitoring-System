// =====================================================
// MILESIGHT WS301 DOOR MONITORING BACKEND
// MQTT -> SUPABASE
// =====================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mqtt = require("mqtt");

const { createClient } = require("@supabase/supabase-js");

// =====================================================
// EXPRESS
// =====================================================

const app = express();

app.use(cors());
app.use(express.json());

// =====================================================
// ENVIRONMENT
// =====================================================

const PORT = process.env.PORT || 3001;

const SUPABASE_URL =
    process.env.SUPABASE_URL;

const SUPABASE_SECRET_KEY =
    process.env.SUPABASE_SECRET_KEY;

const MQTT_URL =
    process.env.MQTT_URL;

const MQTT_USERNAME =
    process.env.MQTT_USERNAME;

const MQTT_PASSWORD =
    process.env.MQTT_PASSWORD;

const MQTT_TOPIC =
    process.env.MQTT_TOPIC;

// =====================================================
// WARNING CONFIGURATION
// =====================================================

const DOOR_WARNING_SECONDS =
    Number(
        process.env.DOOR_WARNING_SECONDS || 20
    );

const WARNING_AUDIO_URL =
    process.env.WARNING_AUDIO_URL || "";

// =====================================================
// SUPABASE
// =====================================================

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
);

// =====================================================
// DEVICE ID
// =====================================================

const DEVICE_ID = "WS301-868M";

// =====================================================
// MQTT
// =====================================================

const mqttClient = mqtt.connect(
    MQTT_URL,
    {
        username: MQTT_USERNAME,

        password: MQTT_PASSWORD,

        clientId:
            "door-monitor-" +
            Math.random()
                .toString(16)
                .substring(2),

        clean: true,

        reconnectPeriod: 5000
    }
);

// =====================================================
// MQTT CONNECT
// =====================================================

mqttClient.on("connect", () => {

    console.log(
        "================================="
    );

    console.log(
        "Connected to HiveMQ"
    );

    console.log(
        "================================="
    );

    mqttClient.subscribe(
        MQTT_TOPIC,
        {
            qos: 1
        },
        (error) => {

            if (error) {

                console.error(
                    "MQTT subscribe error:",
                    error
                );

            } else {

                console.log(
                    "Subscribed to:",
                    MQTT_TOPIC
                );
            }
        }
    );
});

// =====================================================
// MQTT ERROR
// =====================================================

mqttClient.on(
    "error",
    (error) => {

        console.error(
            "MQTT ERROR:",
            error.message
        );
    }
);

// =====================================================
// MQTT MESSAGE
// =====================================================

mqttClient.on(
    "message",
    async (topic, message) => {

        try {

            const data =
                JSON.parse(
                    message.toString()
                );

            console.log(
                "MQTT:",
                data
            );

            await processDoorMessage(
                data
            );

        } catch (error) {

            console.error(
                "Message processing error:",
                error
            );
        }
    }
);

// =====================================================
// PROCESS DOOR MESSAGE
// =====================================================

async function processDoorMessage(
    data
) {

    const status =
        data.magnet_status;

    // =================================================
    // IGNORE INVALID MESSAGES
    // =================================================

    if (
        status !== "open" &&
        status !== "close"
    ) {

        console.log(
            "Ignored message:",
            data
        );

        return;
    }

    const battery =
        data.battery ?? null;

    const tamperStatus =
        data.tamper_status ?? null;

    const now =
        new Date();

    // =================================================
    // GET CURRENT STATE
    // =================================================

    const {
        data: currentState,
        error: stateError
    } =
        await supabase

            .from("door_state")

            .select("*")

            .eq(
                "device_id",
                DEVICE_ID
            )

            .maybeSingle();

    if (stateError) {

        throw stateError;
    }

    // =================================================
    // DOOR OPEN
    // =================================================

    if (status === "open") {

        // Ignore duplicate OPEN messages

        if (
            currentState &&
            currentState.status === "open"
        ) {

            console.log(
                "Door is already open."
            );

            return;
        }

        const openedAt =
            now.toISOString();

        // ---------------------------------------------
        // INSERT EVENT
        // ---------------------------------------------

        const {
            error: eventError
        } =
            await supabase

                .from("door_events")

                .insert({

                    device_id:
                        DEVICE_ID,

                    status:
                        "open",

                    battery:
                        battery,

                    tamper_status:
                        tamperStatus,

                    event_time:
                        openedAt,

                    opened_at:
                        openedAt,

                    closed_at:
                        null,

                    duration_seconds:
                        null
                });

        if (eventError) {

            throw eventError;
        }

        // ---------------------------------------------
        // UPDATE CURRENT STATE
        // ---------------------------------------------

        const {
            error: upsertError
        } =
            await supabase

                .from("door_state")

                .upsert({

                    device_id:
                        DEVICE_ID,

                    status:
                        "open",

                    battery:
                        battery,

                    tamper_status:
                        tamperStatus,

                    opened_at:
                        openedAt,

                    last_closed_at:
                        currentState
                            ?.last_closed_at ??
                        null,

                    last_open_duration_seconds:
                        currentState
                            ?.last_open_duration_seconds ??
                        null,

                    updated_at:
                        openedAt
                });

        if (upsertError) {

            throw upsertError;
        }

        console.log(
            "DOOR OPENED:",
            openedAt
        );

        return;
    }

    // =================================================
    // DOOR CLOSE
    // =================================================

    if (status === "close") {

        // If already closed, ignore duplicate

        if (
            currentState &&
            currentState.status === "close"
        ) {

            console.log(
                "Door is already closed."
            );

            return;
        }

        // ---------------------------------------------
        // FIND OPEN EVENT
        // ---------------------------------------------

        const {
            data: openEvent,
            error: openError
        } =
            await supabase

                .from("door_events")

                .select("*")

                .eq(
                    "device_id",
                    DEVICE_ID
                )

                .eq(
                    "status",
                    "open"
                )

                .is(
                    "closed_at",
                    null
                )

                .order(
                    "event_time",
                    {
                        ascending: false
                    }
                )

                .limit(1)

                .maybeSingle();

        if (openError) {

            throw openError;
        }

        let durationSeconds =
            null;

        let openedAt =
            null;

        // ---------------------------------------------
        // CALCULATE OPEN DURATION
        // ---------------------------------------------

        if (openEvent) {

            openedAt =
                openEvent.opened_at;

            durationSeconds =
                Math.max(
                    0,
                    Math.floor(
                        (
                            now.getTime() -
                            new Date(
                                openedAt
                            ).getTime()
                        ) / 1000
                    )
                );

            // -----------------------------------------
            // UPDATE OPEN EVENT
            // -----------------------------------------

            const {
                error: updateEventError
            } =
                await supabase

                    .from("door_events")

                    .update({

                        closed_at:
                            now.toISOString(),

                        duration_seconds:
                            durationSeconds
                    })

                    .eq(
                        "id",
                        openEvent.id
                    );

            if (updateEventError) {

                throw updateEventError;
            }
        }

        // ---------------------------------------------
        // INSERT CLOSE EVENT
        // ---------------------------------------------

        const {
            error: closeEventError
        } =
            await supabase

                .from("door_events")

                .insert({

                    device_id:
                        DEVICE_ID,

                    status:
                        "close",

                    battery:
                        battery,

                    tamper_status:
                        tamperStatus,

                    event_time:
                        now.toISOString(),

                    opened_at:
                        openedAt,

                    closed_at:
                        now.toISOString(),

                    duration_seconds:
                        durationSeconds
                });

        if (closeEventError) {

            throw closeEventError;
        }

        // ---------------------------------------------
        // UPDATE CURRENT STATE
        // ---------------------------------------------

        const {
            error: stateUpdateError
        } =
            await supabase

                .from("door_state")

                .upsert({

                    device_id:
                        DEVICE_ID,

                    status:
                        "close",

                    battery:
                        battery ??
                        currentState?.battery ??
                        null,

                    tamper_status:
                        tamperStatus ??
                        currentState?.tamper_status ??
                        null,

                    opened_at:
                        openedAt ??
                        currentState?.opened_at ??
                        null,

                    last_closed_at:
                        now.toISOString(),

                    last_open_duration_seconds:
                        durationSeconds,

                    updated_at:
                        now.toISOString()
                });

        if (stateUpdateError) {

            throw stateUpdateError;
        }

        console.log(
            "DOOR CLOSED"
        );

        console.log(
            "Open duration:",
            durationSeconds,
            "seconds"
        );
    }
}

// =====================================================
// API - WARNING CONFIGURATION
// =====================================================

app.get(
    "/api/config",
    (req, res) => {

        res.json({

            warningSeconds:
                DOOR_WARNING_SECONDS,

            warningAudioUrl:
                WARNING_AUDIO_URL
        });
    }
);

// =====================================================
// API - CURRENT DOOR
// =====================================================

app.get(
    "/api/door",
    async (req, res) => {

        try {

            const {
                data,
                error
            } =
                await supabase

                    .from("door_state")

                    .select("*")

                    .eq(
                        "device_id",
                        DEVICE_ID
                    )

                    .maybeSingle();

            if (error) {

                throw error;
            }

            res.json(data);

        } catch (error) {

            console.error(error);

            res.status(500).json({

                error:
                    "Failed to read door status"
            });
        }
    }
);

// =====================================================
// API - DOOR HISTORY
// =====================================================

app.get(
    "/api/door/history",
    async (req, res) => {

        try {

            const {
                data,
                error
            } =
                await supabase

                    .from("door_events")

                    .select("*")

                    .eq(
                        "device_id",
                        DEVICE_ID
                    )

                    .order(
                        "event_time",
                        {
                            ascending: false
                        }
                    )

                    .limit(50);

            if (error) {

                throw error;
            }

            res.json(data);

        } catch (error) {

            console.error(error);

            res.status(500).json({

                error:
                    "Failed to read history"
            });
        }
    }
);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            status:
                "ok",

            mqtt:
                mqttClient.connected,

            time:
                new Date().toISOString()
        });
    }
);

// =====================================================
// START SERVER
// =====================================================

app.listen(
    PORT,
    () => {

        console.log(
            "Backend running on:",
            `http://localhost:${PORT}`
        );

        console.log(
            "Door warning:",
            DOOR_WARNING_SECONDS,
            "seconds"
        );

        console.log(
            "Warning audio:",
            WARNING_AUDIO_URL
        );
    }
);