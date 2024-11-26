export interface CompanyFinancials {
  id: string
  symbol: string
  name: string
  totalShares: number
  promoterHolding: number
  revenue: {
    current: number
    previousQuarter: number
    previousYear: number
  }
  pat: number
  ebitda: number
  fixedAssets: number
  totalLiabilities: number
  employeeCount: number
  lastDividend: number
  lastUpdated: string
}

export interface CompanyExportFormat {
  Symbol: string
  Name: string
  "Total Shares": number
  "Promoter Holding": number
  "Revenue-Current": number
  "Revenue-Previous Quarter": number
  "Revenue-Previous Year": number
  "Fixed Assets": number
  "Total Liabilities": number
  "Employee Count": number
  PAT: number
  EBITDA: number
  "Last Updated": string
}
