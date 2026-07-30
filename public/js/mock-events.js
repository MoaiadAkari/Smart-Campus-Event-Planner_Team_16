const DEFAULT_EVENTS = [
  {
    eventId: 1,
    title: "Resume and Interview Workshop",
    description: "Learn how to improve your resume and prepare for interviews.",
    category: "Career",
    eventDate: getEventDateFromToday(2),
    startTime: "13:00",
    endTime: "15:00",
    location: "Hall Building, Room H-535",
    capacity: 40,
    status: "Open",
    organizerId: 2,
    createdOn: getEventDateFromToday(-15)
  },
  {
    eventId: 2,
    title: "Introduction to Web Development",
    description: "A beginner-friendly workshop about HTML, CSS, and JavaScript.",
    category: "Academic",
    eventDate: getEventDateFromToday(5),
    startTime: "10:00",
    endTime: "12:00",
    location: "EV Building, Room EV-2.260",
    capacity: 35,
    status: "Open",
    organizerId: 2,
    createdOn: getEventDateFromToday(-12)
  },
  {
    eventId: 3,
    title: "Campus Networking Evening",
    description: "Meet students, alumni, and campus organization representatives.",
    category: "Networking",
    eventDate: getEventDateFromToday(-10),
    startTime: "17:00",
    endTime: "19:00",
    location: "John Molson Building",
    capacity: 100,
    status: "Completed",
    organizerId: 2,
    createdOn: getEventDateFromToday(-30)
  },
  {
    eventId: 4,
    title: "Outdoor Soccer Tournament",
    description: "Join students from different departments for a soccer tournament.",
    category: "Sports",
    eventDate: getEventDateFromToday(8),
    startTime: "11:00",
    endTime: "16:00",
    location: "Loyola Campus Field",
    capacity: 60,
    status: "Cancelled",
    organizerId: 2,
    createdOn: getEventDateFromToday(-10)
  },
  {
    eventId: 5,
    title: "Student Club Fair",
    description: "Discover student clubs and learn how to become involved on campus.",
    category: "Club Activity",
    eventDate: getEventDateFromToday(4),
    startTime: "12:00",
    endTime: "16:00",
    location: "Hall Building Atrium",
    capacity: 150,
    status: "Open",
    organizerId: 2,
    createdOn: getEventDateFromToday(-8)
  },
  {
    eventId: 6,
    title: "Guest Lecture on Artificial Intelligence",
    description: "A discussion about current developments in artificial intelligence.",
    category: "Guest Lecture",
    eventDate: getEventDateFromToday(7),
    startTime: "18:00",
    endTime: "20:00",
    location: "MB Building, Room MB-1.210",
    capacity: 80,
    status: "Open",
    organizerId: 2,
    createdOn: getEventDateFromToday(-6)
  },
  {
    eventId: 7,
    title: "Community Volunteering Day",
    description: "Volunteer with other students to support a local community project.",
    category: "Volunteering",
    eventDate: getEventDateFromToday(12),
    startTime: "09:00",
    endTime: "14:00",
    location: "Concordia Greenhouse",
    capacity: 4,
    status: "Full",
    organizerId: 2,
    createdOn: getEventDateFromToday(-5)
  }
];

function getEventDateFromToday(numberOfDays) {
  const date = new Date();
  date.setDate(date.getDate() + numberOfDays);
  return date.toISOString().split("T")[0];
}

function getStoredEvents() {
  const savedEvents = localStorage.getItem("smartCampusEvents");

  if (!savedEvents) {
    localStorage.setItem("smartCampusEvents", JSON.stringify(DEFAULT_EVENTS));
    return DEFAULT_EVENTS.map(event => ({ ...event }));
  }

  try {
    return JSON.parse(savedEvents);
  } catch {
    localStorage.setItem("smartCampusEvents", JSON.stringify(DEFAULT_EVENTS));
    return DEFAULT_EVENTS.map(event => ({ ...event }));
  }
}

function saveStoredEvents(events) {
  localStorage.setItem("smartCampusEvents", JSON.stringify(events));
}

function getStoredEventById(eventId) {
  return getStoredEvents().find(event => event.eventId === Number(eventId));
}

function getNextEventId(events) {
  return events.length === 0
    ? 1
    : Math.max(...events.map(event => Number(event.eventId))) + 1;
}

window.DEFAULT_EVENTS = DEFAULT_EVENTS;
window.getStoredEvents = getStoredEvents;
window.saveStoredEvents = saveStoredEvents;
window.getStoredEventById = getStoredEventById;
window.getNextEventId = getNextEventId;
