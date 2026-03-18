import { getQueryScoresTool } from "./queryScores";
import { getSemanticSearchTool } from "./semanticSearch";
import { getCompanyProfileTool } from "./getCompanyProfile";
import { getComputeAggregateTool } from "./computeAggregate";

export function getDataTools(datasetId: string) {
  return [
    getQueryScoresTool(datasetId),
    getSemanticSearchTool(datasetId),
    getCompanyProfileTool(datasetId),
    getComputeAggregateTool(datasetId),
  ];
}

export { executeQueryScores } from "./queryScores";
export { executeSemanticSearch } from "./semanticSearch";
export { executeGetCompanyProfile } from "./getCompanyProfile";
export { executeComputeAggregate } from "./computeAggregate";
