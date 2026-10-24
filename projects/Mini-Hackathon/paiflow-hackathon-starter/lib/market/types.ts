export type Profile = {
  id: string;
  name: string;
  tagline: string;
  walletAddress?: string;
  createdAt: string;
};

export type ShiftStatus =
  | "open"
  | "accepted"
  | "escrowed"
  | "completed"
  | "cancelled";

export type Shift = {
  id: string;
  posterId: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  /** Whitelisted tier stroop string, e.g. "10000000" (1 XLM). */
  amountStroops: string;
  status: ShiftStatus;
  acceptedClaimId?: string;
  escrowTxHash?: string;
  createdAt: string;
};

export type Claim = {
  id: string;
  shiftId: string;
  workerId: string;
  note?: string;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  createdAt: string;
};

export type Thread = {
  id: string;
  shiftId: string;
  posterId: string;
  workerId: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  sentAt: string;
};

export type Rating = {
  id: string;
  shiftId: string;
  raterId: string;
  rateeId: string;
  stars: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createdAt: string;
};

export type MarketState = {
  version: 1;
  seededAt: string;
  profiles: Profile[];
  shifts: Shift[];
  claims: Claim[];
  threads: Thread[];
  messages: ChatMessage[];
  ratings: Rating[];
};

export const MARKET_STATE_KEY = "campusmarket:v1";
export const MARKET_IDENTITY_KEY = "campusmarket:v1:identity";

export function threadIdFor(shiftId: string, workerId: string): string {
  return `thread:${shiftId}:${workerId}`;
}
