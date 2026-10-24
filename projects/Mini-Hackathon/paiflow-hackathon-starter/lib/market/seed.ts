import type { MarketState } from "@/lib/market/types";

const T0 = "2026-10-20T09:00:00Z";

export function seedState(): MarketState {
  return {
    version: 1,
    seededAt: T0,
    profiles: [
      {
        id: "p-maya",
        name: "Maya Chen",
        tagline: "Barista at the campus café, third-year CS",
        createdAt: T0,
      },
      {
        id: "p-dev",
        name: "Dev Okafor",
        tagline: "Free between lectures, will work for XLM",
        createdAt: T0,
      },
      {
        id: "p-lena",
        name: "Lena Torres",
        tagline: "Library front-desk veteran",
        createdAt: T0,
      },
      {
        id: "p-sam",
        name: "Sam Whitfield",
        tagline: "Events crew lead, gym enthusiast",
        createdAt: T0,
      },
    ],
    shifts: [
      {
        id: "shift-cafe-morning",
        posterId: "p-maya",
        title: "Café morning rush cover",
        description:
          "Run the espresso machine and till for the 8–11 rush. Apron and short training provided; must be friendly under pressure.",
        location: "Campus Café, Student Center",
        startsAt: "2026-10-23T08:00:00Z",
        endsAt: "2026-10-23T11:00:00Z",
        amountStroops: "10000000",
        status: "open",
        createdAt: "2026-10-21T10:00:00Z",
      },
      {
        id: "shift-library-desk",
        posterId: "p-lena",
        title: "Library front-desk evening",
        description:
          "Check out books, answer basic questions, shelve returns. Quiet hours after 9pm — good study time.",
        location: "Main Library, floor 1",
        startsAt: "2026-10-24T17:00:00Z",
        endsAt: "2026-10-24T22:00:00Z",
        amountStroops: "20000000",
        status: "open",
        createdAt: "2026-10-21T12:30:00Z",
      },
      {
        id: "shift-event-setup",
        posterId: "p-sam",
        title: "Career-fair booth setup",
        description:
          "Unload crates, assemble booths, run extension cords. Steel-toe shoes preferred; team of three.",
        location: "Sports Hall B",
        startsAt: "2026-10-25T06:00:00Z",
        endsAt: "2026-10-25T10:00:00Z",
        amountStroops: "50000000",
        status: "open",
        createdAt: "2026-10-22T07:45:00Z",
      },
      {
        id: "shift-tutoring",
        posterId: "p-lena",
        title: "Calculus I tutoring session",
        description:
          "One-on-one session covering limits and derivatives. Textbook chapter 2; whiteboard room booked.",
        location: "Math Building, room 204",
        startsAt: "2026-10-26T15:00:00Z",
        endsAt: "2026-10-26T16:30:00Z",
        amountStroops: "100000000",
        status: "open",
        createdAt: "2026-10-22T08:15:00Z",
      },
      {
        id: "shift-gym-desk",
        posterId: "p-sam",
        title: "Gym front-desk cover",
        description:
          "Swipe students in, wipe down equipment hourly. Low-key shift, mostly studying.",
        location: "Campus Recreation Center",
        startsAt: "2026-10-20T18:00:00Z",
        endsAt: "2026-10-20T22:00:00Z",
        amountStroops: "10000000",
        status: "accepted",
        acceptedClaimId: "claim-gym-1",
        createdAt: "2026-10-19T09:00:00Z",
      },
      {
        id: "shift-bookstore",
        posterId: "p-maya",
        title: "Bookstore stock-take (done)",
        description:
          "Counted textbook inventory with a scanner gun. Done and paid — thanks Dev!",
        location: "Campus Bookstore",
        startsAt: "2026-10-18T14:00:00Z",
        endsAt: "2026-10-18T18:00:00Z",
        amountStroops: "20000000",
        status: "completed",
        acceptedClaimId: "claim-book-1",
        escrowTxHash:
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        createdAt: "2026-10-17T11:00:00Z",
      },
    ],
    claims: [
      {
        id: "claim-gym-1",
        shiftId: "shift-gym-desk",
        workerId: "p-dev",
        note: "I lift here every day anyway — easy cover.",
        status: "accepted",
        createdAt: "2026-10-19T14:00:00Z",
      },
      {
        id: "claim-gym-2",
        shiftId: "shift-gym-desk",
        workerId: "p-maya",
        status: "declined",
        createdAt: "2026-10-19T15:30:00Z",
      },
      {
        id: "claim-book-1",
        shiftId: "shift-bookstore",
        workerId: "p-dev",
        note: "Available the whole afternoon.",
        status: "accepted",
        createdAt: "2026-10-17T12:00:00Z",
      },
    ],
    threads: [
      {
        id: "thread:shift-gym-desk:p-dev",
        shiftId: "shift-gym-desk",
        posterId: "p-sam",
        workerId: "p-dev",
        createdAt: "2026-10-19T14:05:00Z",
      },
    ],
    messages: [
      {
        id: "msg-seed-1",
        threadId: "thread:shift-gym-desk:p-dev",
        senderId: "p-dev",
        body: "Hey! Claimed the gym desk shift — I basically live there.",
        sentAt: "2026-10-19T14:06:00Z",
      },
      {
        id: "msg-seed-2",
        threadId: "thread:shift-gym-desk:p-dev",
        senderId: "p-sam",
        body: "Perfect. Desk code is 4471, swipe cards are in the top drawer.",
        sentAt: "2026-10-19T14:12:00Z",
      },
      {
        id: "msg-seed-3",
        threadId: "thread:shift-gym-desk:p-dev",
        senderId: "p-dev",
        body: "Got it. See you at 6.",
        sentAt: "2026-10-19T14:13:00Z",
      },
    ],
    ratings: [
      {
        id: "rate-seed-1",
        shiftId: "shift-bookstore",
        raterId: "p-maya",
        rateeId: "p-dev",
        stars: 5,
        comment: "Fast, accurate, zero complaints.",
        createdAt: "2026-10-19T09:00:00Z",
      },
      {
        id: "rate-seed-2",
        shiftId: "shift-bookstore",
        raterId: "p-dev",
        rateeId: "p-maya",
        stars: 5,
        comment: "Clear instructions, paid right away.",
        createdAt: "2026-10-19T09:30:00Z",
      },
    ],
  };
}
