export type BackstageNode = {
  id: string;
  label: string;
};

export type BackstageEdge = {
  from: string;
  to: string;
};

export type BackstageEndpoint = {
  path: string;
  method: string;
};

export type BackstageWorkflow = {
  id: string;
  name: string;
  active: boolean;
  triggers: string[];
  schedule?: string;
  endpoints?: BackstageEndpoint[];
  integrations: string[];
  tags?: string[];
  description?: string;
  graph: {
    nodes: BackstageNode[];
    edges: BackstageEdge[];
  };
};

export type BackstageResponse = {
  generated_at: string;
  total_workflows: number;
  workflows: BackstageWorkflow[];
};
