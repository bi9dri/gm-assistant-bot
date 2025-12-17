export interface GameSession {
  id: number;
  name: string;

  guild: Guild;
  category: Category;
  roles: Role[];

  nodes: { [id: number]: TemplateNode & { executedAt?: Date } };
  createdAt: Date;
}

export interface Guild {
  id: string;
  name: string;
  icon: string;
}

export interface Category {
  id: string;
  name: string;
  channels: Channel[];
}

export interface Channel {
  id: string;
  name: string;
  type: "text" | "voice";
  writerRoles: Role[];
  readerRoles: Role[];
}

export interface Role {
  id: string;
  name: string;
}

export interface Template {
  id: number;
  name: string;
  roles: string[];
  channels: {
    name: string;
    type: "text" | "voice";
    writerRoles: string[];
    readerRoles: string[];
  }[];
  nodes: { [id: number]: TemplateNode };
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateNode {
  id: number;
}
