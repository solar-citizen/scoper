export type PRFile = {
  filename: string;
  patch?: string;
  status: string;
};

export type PRContext = {
  owner: string;
  repo: string;
  pullNumber: number;
  sha: string;
};

export type ReviewComment = {
  path: string;
  line: number;
  side: 'RIGHT';
  body: string;
};
