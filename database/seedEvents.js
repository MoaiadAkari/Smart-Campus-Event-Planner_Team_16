const db = require("./database");

const insertEvent = db.prepare(`
    INSERT INTO events (
        title,
        description,
        category,
        event_date,
        start_time,
        end_time,
        location,
        capacity,
        event_status,
        organizer_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const events = [
    [
        "Resume and Interview Workshop",
        "Learn how to improve your resume and prepare for interviews.",
        "Career",
        "2026-08-13",
        "13:00",
        "15:00",
        "Hall Building, Room H-535",
        40,
        "Open",
        1
    ],
    [
        "Introduction to Web Development",
        "A beginner-friendly workshop about HTML, CSS, and JavaScript.",
        "Academic",
        "2026-08-16",
        "10:00",
        "12:00",
        "EV Building, Room EV-2.260",
        35,
        "Open",
        1
    ],
    [
        "Student Club Fair",
        "Discover student clubs and learn how to become involved on campus.",
        "Club Activity",
        "2026-08-15",
        "12:00",
        "16:00",
        "Hall Building Atrium",
        150,
        "Open",
        1
    ]
];

const transaction = db.transaction(() => {
    for (const event of events) {
        insertEvent.run(...event);
    }
});

transaction();

console.log("Sample events inserted successfully.");