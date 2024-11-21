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
