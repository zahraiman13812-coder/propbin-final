export type SupportRole = "user" | "admin";

export type SupportMessage = {
  id: string;
  role: SupportRole;
  text: string;
  createdAt: string;
  readByUser: boolean;
  readByAdmin: boolean;
};

export type SupportThread = {
  id: string;
  userId: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  status: "open" | "closed";
  messages: SupportMessage[];
};
