const FORBIDDEN_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "CREATE",
  "TRUNCATE",
  "ALTER",
  "GRANT",
  "REVOKE",
  "EXEC",
  "EXECUTE",
  "CALL",
  "xp_",
  "UNION ALL SELECT",
];

export function validateSQL(
  sql: string,
  datasetId: string
): { valid: boolean; error?: string; sanitized: string } {
  const upper = sql.toUpperCase().trim();

  // Must start with SELECT
  if (!upper.startsWith("SELECT")) {
    return {
      valid: false,
      error: "Only SELECT statements are allowed",
      sanitized: "",
    };
  }

  // Check for forbidden keywords
  for (const kw of FORBIDDEN_KEYWORDS) {
    if (upper.includes(kw.toUpperCase())) {
      return {
        valid: false,
        error: `Forbidden keyword detected: ${kw}`,
        sanitized: "",
      };
    }
  }

  // Replace $DATASET_ID placeholder with the actual dataset ID
  const sanitized = sql.replace(/\$DATASET_ID/g, `'${datasetId}'`);

  return { valid: true, sanitized };
}
