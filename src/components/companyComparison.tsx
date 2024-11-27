"use client"
import React, { ReactNode, useEffect, useMemo, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/select"
import {
  PlusIcon,
  FileDown,
  ArrowRight,
  Calendar,
  FileText,
  CircleAlert,
  UserCircle,
} from "lucide-react"
import {
  BarChart,
  Bar,
  Rectangle,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { CompanyFinancials, CompanyExportFormat } from "@/types/company"
import Loading from "@/app/loading"
import { motion } from "framer-motion"

import { DatePicker } from "@nextui-org/date-picker"
import { parseDate } from "@internationalized/date"
import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { UserOptions } from "jspdf-autotable"

interface jsPDFCustom extends jsPDF {
  autoTable: (options: UserOptions) => void
}

const CompanyComparison = () => {
  const [companies, setCompanies] = useState<CompanyFinancials[]>([])
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [viewGraph, setViewGraph] = useState(false)
  const [loading, setLoading] = useState(true)
  const [availableCompanies, setAvailableCompanies] = useState<
    CompanyFinancials[]
  >([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [exportStep, setExportStep] = useState(1)
  const [exportName, setExportName] = useState("")
  const [startDate, setStartDate] = useState(parseDate("2023-03-10"))
  const [endDate, setEndDate] = useState(parseDate("2024-03-10"))
  const [exportReason, setExportReason] = useState("")
  const [exportFormat, setExportFormat] = useState("csv")

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch(`/api/companies`, {
          cache: "force-cache",
          next: { revalidate: 60 },
        })
        console.log("Response status:", response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("Error response text:", errorText)
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setCompanies(data)
        setAvailableCompanies(data)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching companies:", error)
        setLoading(false)
      }
    }
    fetchCompanies()
  }, [])

  const handleCompanySelect = (companyId: string) => {
    // for duplicate ids
    if (!selectedCompanies.includes(companyId)) {
      setSelectedCompanies((prev) => [...prev, companyId])
      setAvailableCompanies((prev) =>
        prev.filter((company) => company.id !== companyId)
      )
    }
  }

  const handleRemoveCompany = (companyId: string) => {
    setSelectedCompanies((prev) => prev.filter((id) => id !== companyId))
    const removedCompany = companies.find((c) => c.id === companyId)
    if (removedCompany) {
      setAvailableCompanies((prev) => [...prev, removedCompany])
    }
  }

  const getSelectedCompanyData = (companyId: string) => {
    return companies.find((c) => c.id === companyId)
  }

  const getRevenueGrowth = (company: CompanyFinancials) => {
    if (!company) return { qoq: 0, yoy: 0 }
    const qoq =
      ((company.revenue.current - company.revenue.previousQuarter) /
        company.revenue.previousQuarter) *
      100
    const yoy =
      ((company.revenue.current - company.revenue.previousYear) /
        company.revenue.previousYear) *
      100
    return { qoq, yoy }
  }
  const revenueChartData = companies
    .filter((company) => selectedCompanies.includes(company.id))
    .map((company) => ({
      name: company.symbol,
      current: company.revenue.current,
      previousQuarter: company.revenue.previousQuarter,
      previousYear: company.revenue.previousYear,
    }))

  const filteredData = useMemo(() => {
    return companies.filter((item) => {
      const lastUpdated = new Date(item.lastUpdated)
      const date1: Date = new Date(startDate.toString())
      const date2: Date = new Date(endDate.toString())
      return lastUpdated >= date1 && lastUpdated <= date2
    })
  }, [startDate, endDate, companies])
  console.log(filteredData, "filgegcb")
  const dataToExport = filteredData.map((item) => ({
    Symbol: item.symbol,
    Name: item.name,
    "Total Shares": item.totalShares,
    "Promoter Holding": item.promoterHolding,
    "Revenue-Current": item.revenue.current,
    "Revenue-Previous Quarter": item.revenue.previousQuarter,
    "Revenue-Previous Year": item.revenue.previousYear,
    "Fixed Assets": item.fixedAssets,
    "Total Liabilities": item.totalLiabilities,
    "Employee Count": item.employeeCount,
    PAT: item.pat,
    EBITDA: item.ebitda,
    "Last Updated": item.lastUpdated,
  }))

  const exportData = () => {
    switch (exportFormat) {
      case "csv":
        if (dataToExport.length !== 0) {
          exportToCSV(dataToExport, exportName)
          setExportReason("")
          setExportStep(1)
          setIsDialogOpen(false)
          break
        }
        setExportStep(2)

      case "xlsx":
        if (dataToExport.length !== 0) {
          exportToExcel(dataToExport, exportName)
          setExportReason("")
          setExportStep(1)
          setIsDialogOpen(false)
          break
        }
        setExportStep(2)
      case "pdf":
        if (dataToExport.length !== 0) {
          exportToPDF(dataToExport, exportName)
          setExportReason("")
          setExportStep(1)
          setIsDialogOpen(false)
          break
        }
        setExportStep(2)
    }
  }

  const exportToCSV = (data: CompanyExportFormat[], exportName: string) => {
    // console.log(data, "data///////")
    const csvContent = [
      Object.keys(data[0]).join(","),
      ...data.map((item) => Object.values(item).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${exportName}_financials.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToExcel = (data: CompanyExportFormat[], exportName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Financials")

    const blob = new Blob(
      [XLSX.write(workbook, { type: "array", bookType: "xlsx" })],
      {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }
    )
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${exportName}_financials.xlsx`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = (data: CompanyExportFormat[], exportName: string) => {
    const doc = new jsPDF() as jsPDFCustom

    doc.text(`${exportName} Financials`, 14, 15)
    doc.autoTable({
      startY: 25,
      head: [Object.keys(data[0])],
      body: data.map((item) => Object.values(item)),
      theme: "striped",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    })

    doc.save(`${exportName}_financials.pdf`)
  }

  const renderExportStep = () => {
    switch (exportStep) {
      case 1:
        return (
          <div className="space-y-4 p-4 rounded-xl shadow-xl">
            <div className="flex items-center space-x-2  ">
              <UserCircle className="text-gray-500" />
              <label className="text-sm font-medium ">Export Name</label>
            </div>
            <input
              type="text"
              placeholder="Enter the export name"
              value={exportName}
              onChange={(e) => setExportName(e.target.value)}
              className="w-full p-2 border rounded-lg shadow-lg "
            />
            <MotionProv>
              <button
                onClick={() => setExportStep(2)}
                disabled={!exportName.trim()}
                className="w-full p-2 bg-[#8884e8] text-white rounded-xl shadow-xl disabled:bg-gray-300"
              >
                Next <ArrowRight className="ml-2 inline" />
              </button>
            </MotionProv>
          </div>
        )
      case 2:
        return (
          <div className="space-y-4 p-4">
            <div className="flex items-center space-x-2">
              <MotionProv>
                <Calendar className="text-gray-700" />
              </MotionProv>
              <label className="text-md text-gray-600 font-bold">
                Select Date Range
              </label>
            </div>
            {exportReason ? (
              dataToExport.length === 0 ? (
                <span className=" flex flex-row gap-2">
                  <CircleAlert className="h-10px text-red-500" />
                  <div className="text-sm text-gray-500">
                    There is no data aligning with these dates, please select
                    dates again!
                  </div>
                </span>
              ) : (
                ""
              )
            ) : (
              ""
            )}
            <div className="flex flex-row gap-8">
              <div className="w-full flex flex-col gap-y-2">
                <DatePicker
                  className=" max-w-[284px] m-2 "
                  label="Start date"
                  classNames={{
                    base: "bg-white-500",
                    calendar: "bg-indigo-100 p-1",
                  }}
                  // visibleMonths={15}
                  value={startDate}
                  onChange={(date) => setStartDate(date)}
                />
              </div>
              <DatePicker
                className="max-w-[284px] m-2"
                label="End date"
                // visibleMonths={15}
                classNames={{
                  base: "bg-white-500",
                  calendar: "bg-indigo-100 p-1",
                }}
                value={endDate}
                onChange={(date) => setEndDate(date)}
              />
            </div>

            <div className="flex space-x-2">
              <MotionProv className="w-1/2 p-2 border rounded-xl shadow-xl items-center justify-center">
                <button
                  onClick={() => setExportStep(1)}
                  className="items-center justify-center w-full"
                >
                  Back
                </button>
              </MotionProv>
              <MotionProv className="w-1/2 p-2 bg-[#8884e8] text-white rounded-xl shadow-xl ">
                <button
                  className=" items-center justify-center w-full"
                  onClick={() => setExportStep(3)}
                >
                  Next <ArrowRight className="ml-2 inline " />
                </button>
              </MotionProv>
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-4 p-4">
            <div className="flex items-center space-x-2 ">
              <FileText className="text-gray-500" />
              <label className="text-sm font-medium">Export Reason</label>
            </div>
            <textarea
              placeholder="Enter the reason for this export"
              value={exportReason}
              onChange={(e) => setExportReason(e.target.value)}
              className="w-full p-2 border rounded-xl  min-h-[100px]"
            />
            <div className="flex space-x-2 rounded-xl shadow-lg">
              <select
                value={exportFormat}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setExportFormat(e.target.value)
                }
                className="w-full p-2 border rounded-xl cursor-pointer"
              >
                <option value="csv">CSV</option>
                <option value="xlsx">XLSX</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <div className="flex space-x-2">
              <MotionProv className="w-1/2 p-2 border rounded-xl shadow-xl">
                <button
                  onClick={() => setExportStep(2)}
                  className="w-full rounded-xl"
                >
                  Back
                </button>
              </MotionProv>
              <MotionProv className="w-1/2 p-2 bg-green-500 text-white hover:bg-green-700 shadow-xl rounded-xl disabled:bg-gray-300">
                <button
                  onClick={() => {
                    exportData()
                  }}
                  disabled={!exportReason.trim()}
                  className="w-full rounded-xl disabled:cursor-not-allowed"
                >
                  Export <FileDown className="ml-2 inline" />
                </button>
              </MotionProv>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  if (loading) {
    return <Loading />
  }
  return (
    <div className="p-6 w-full mx-auto flex flex-col items-center justify-center">
      <div className="mb-8 w-full flex flex-col items-center justify-center">
        <h1 className="flex mx-2 text-3xl font-bold mb-4">
          Company-Wise Financial Comparison
        </h1>
        <span className="flex flex-row w-full justify-center ">
          <div className="flex items-center justify-center   w-[400px]">
            <Select
              onValueChange={handleCompanySelect}
              disabled={availableCompanies.length === 0}
            >
              <SelectTrigger
                className={`w-[280px] text-md rounded-xl h-fit border border-gray-200 ${
                  availableCompanies.length === 0 && "cursor-no-drop"
                } `}
              >
                {selectedCompanies.length > 0 && (
                  <>
                    <p className="float-left mr-auto text-md font-semibold p-1">
                      Add a company to compare
                    </p>
                    <p className="float-right">
                      <PlusIcon />
                    </p>
                  </>
                )}
              </SelectTrigger>
              <SelectContent>
                {availableCompanies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    <span>
                      {company.name} ({company.symbol})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCompanies.length > 0 && (
            <div className="ml-auto m-auto mr-8 items-center justify-center">
              <MotionProv>
                <MotionProv>
                  <button
                    className="min-h-10  h-fit p-2 m-4 bg-[#ffc653]   text-black hover:bg-black hover:text-white rounded-xl shadow-xl "
                    onClick={() => setViewGraph((x) => !x)}
                  >
                    {viewGraph ? "View Table" : "View Graph"}
                  </button>
                </MotionProv>
              </MotionProv>
            </div>
          )}
          {selectedCompanies.length > 0 && (
            <>
              <div className="ml-auto mr-8 items-center justify-center ">
                <MotionProv>
                  <MotionProv>
                    <button
                      onClick={() => setIsDialogOpen(true)}
                      className="min-h-10  h-fit p-2 m-4 bg-green-500 text-gray-700 hover:bg-green-800 hover:text-white rounded-xl shadow-xl"
                    >
                      <span className="flex flex-row items-center justify-center mx-2 ">
                        <FileDown className="p-0.5" />

                        <div className=" text-sm font-bold   p-1">
                          Export Data
                        </div>
                      </span>
                    </button>
                  </MotionProv>
                </MotionProv>
              </div>
              {isDialogOpen && (
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 rounded-xl shadow-xl">
                  <div className="bg-white rounded-xl shadow-xl w-[400px] ">
                    <div className="p-4 border-b flex justify-between items-center">
                      <h2 className="text-lg font-semibold">
                        Export Company Financials
                      </h2>
                      <MotionProv>
                        <button
                          onClick={() => setIsDialogOpen(false)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ✕
                        </button>
                      </MotionProv>
                    </div>
                    {renderExportStep()}
                  </div>
                </div>
              )}
            </>
          )}
        </span>

        {selectedCompanies.length > 0 && (
          <div className="my-4 mx-8 w-full grid grid-cols-5 gap-2">
            {selectedCompanies.map((companyId) => {
              const company = getSelectedCompanyData(companyId)
              return company ? (
                <MotionProv
                  key={companyId}
                  className="flex bg-gray-200 flex-row  justify-items-stretch hover:bg-gray-300 p-2 rounded-xl gap-4"
                >
                  {/* <div className="flex flex-row  "> */}
                  <div className="text-xs  font-semibold text-gray-700 flex flex-col p-1">
                    <p>{company.name}</p>
                    <p className="">({company.symbol})</p>
                  </div>
                  <div className="flex ml-auto text-red-500  p-2">
                    <MotionProv>
                      <button
                        onClick={() => handleRemoveCompany(companyId)}
                        // className="text-red-500 justify-items-end  mb-auto hover:text-red-700 p-2"
                      >
                        ×
                      </button>
                    </MotionProv>
                  </div>
                  {/* </div> */}
                </MotionProv>
              ) : null
            })}
          </div>
        )}
      </div>

      {selectedCompanies.length > 0 &&
        (viewGraph === false ? (
          <>
            {selectedCompanies.length > 1 && (
              <div className=" text-xs w-full p-2 ">
                <p className="float-left text-gray-400">
                  *Negative percentages displayed on the right bottom of each
                  cell reprecent depreciation in the metric upon comparison.
                </p>
              </div>
            )}
            <div className="border border-gray-300 w-full rounded-xl">
              <div className=" container overflow-x-auto rounded-xl">
                <table className="w-full border-collapse border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Metrics</th>
                      {selectedCompanies.map((companyId) => {
                        const company = getSelectedCompanyData(companyId)
                        return company ? (
                          <th key={companyId} className="border p-2 text-left">
                            {company.name} ({company.symbol})
                          </th>
                        ) : null
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {/* TotalShares */}
                    <tr>
                      <td className="border p-2 font-medium">Total Shares</td>
                      {selectedCompanies.map((companyId) => {
                        const company = getSelectedCompanyData(companyId)
                        const maximumShares = Math.max(
                          ...selectedCompanies.map((companyId: string) => {
                            const selectedCompanyData =
                              getSelectedCompanyData(companyId)
                            return selectedCompanyData?.totalShares || 0
                          })
                        )
                        if (!company) {
                          return
                        }
                        const percentDecrease =
                          ((maximumShares - company.totalShares) /
                            maximumShares) *
                          100

                        return (
                          <td key={companyId} className="border p-2 ">
                            {company.totalShares.toLocaleString()}
                            <br />
                            <div className="text-xs float-right text-red-500">
                              {company.totalShares == maximumShares ? (
                                <p className="text-green-600">0</p>
                              ) : (
                                `-${percentDecrease.toFixed(2)}%`
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                    {/* Promoter Holding */}
                    <tr>
                      <td className="border p-2 font-medium">
                        Promoter Holding
                      </td>
                      {selectedCompanies.map((companyId) => {
                        const company = getSelectedCompanyData(companyId)
                        const maximumPromoterHolding = Math.max(
                          ...selectedCompanies.map((companyId: string) => {
                            const selectedCompanyData =
                              getSelectedCompanyData(companyId)
                            return selectedCompanyData?.promoterHolding || 0
                          })
                        )
                        if (!company) {
                          return
                        }
                        const percentDecrease =
                          ((maximumPromoterHolding - company.promoterHolding) /
                            maximumPromoterHolding) *
                          100
                        return (
                          <td key={companyId} className="border p-2">
                            {company ? `${company.promoterHolding}%` : "-"}
                            <br />
                            <div className="text-xs float-right text-red-500">
                              {company.promoterHolding ==
                              maximumPromoterHolding ? (
                                <p className="text-green-600">0</p>
                              ) : (
                                `-${percentDecrease.toFixed(2)}%`
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>

                    {/* Revenue */}
                    <tr>
                      <td className="border p-2 font-medium">
                        Revenue (Current)
                      </td>
                      {selectedCompanies.map((companyId) => {
                        const company = getSelectedCompanyData(companyId)

                        const maximumRevenue = Math.max(
                          ...selectedCompanies.map((companyId: string) => {
                            const selectedCompanyData =
                              getSelectedCompanyData(companyId)
                            return selectedCompanyData?.revenue.current || 0
                          })
                        )
                        if (!company) {
                          return
                        }
                        const percentDecrease =
                          ((maximumRevenue - company.revenue.current) /
                            maximumRevenue) *
                          100

                        return (
                          <td key={companyId} className="border p-2">
                            {company
                              ? `₹${company.revenue.current.toLocaleString()}Cr`
                              : "-"}
                            <br />
                            <div className="text-xs float-right text-red-500">
                              {company.revenue.current == maximumRevenue ? (
                                <p className="text-green-600">0</p>
                              ) : (
                                `-${percentDecrease.toFixed(2)}%`
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>

                    {/* PAT */}
                    <tr>
                      <td className="border p-2 font-medium">PAT</td>
                      {selectedCompanies.map((companyId) => {
                        const company = getSelectedCompanyData(companyId)

                        const maximumPAT = Math.max(
                          ...selectedCompanies.map((companyId: string) => {
                            const selectedCompanyData =
                              getSelectedCompanyData(companyId)
                            return selectedCompanyData?.pat || 0
                          })
                        )
                        if (!company) {
                          return
                        }
                        const percentDecrease =
                          ((maximumPAT - company.pat) / maximumPAT) * 100
                        return (
                          <td key={companyId} className="border p-2">
                            {company
                              ? `₹${company.pat.toLocaleString()}Cr`
                              : "-"}
                            <br />
                            <div className="text-xs float-right text-red-500">
                              {company.pat == maximumPAT ? (
                                <p className="text-green-600">0</p>
                              ) : (
                                `-${percentDecrease.toFixed(2)}%`
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>

                    {/* EBITDA */}
                    <tr>
                      <td className="border p-2 font-medium">EBITDA</td>
                      {selectedCompanies.map((companyId) => {
                        const company = getSelectedCompanyData(companyId)
                        const maximumEBITDA = Math.max(
                          ...selectedCompanies.map((companyId: string) => {
                            const selectedCompanyData =
                              getSelectedCompanyData(companyId)
                            return selectedCompanyData?.ebitda || 0
                          })
                        )
                        if (!company) {
                          return
                        }
                        const percentDecrease =
                          ((maximumEBITDA - company.ebitda) / maximumEBITDA) *
                          100
                        return (
                          <td key={companyId} className="border p-2">
                            {company
                              ? `₹${company.ebitda.toLocaleString()}Cr`
                              : "-"}
                            <br />
                            <div className="text-xs float-right text-red-500">
                              {company.ebitda == maximumEBITDA ? (
                                <p className="text-green-600">0</p>
                              ) : (
                                `-${percentDecrease.toFixed(2)}%`
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>

                    {/* Fixed Assets */}
                    <tr>
                      <td className="border p-2 font-medium">Fixed Assets</td>
                      {selectedCompanies.map((companyId) => {
                        const company = getSelectedCompanyData(companyId)
                        const maximumFixedAssets = Math.max(
                          ...selectedCompanies.map((companyId: string) => {
                            const selectedCompanyData =
                              getSelectedCompanyData(companyId)
                            return selectedCompanyData?.fixedAssets || 0
                          })
                        )
                        if (!company) {
                          return
                        }
                        const percentDecrease =
                          ((maximumFixedAssets - company.fixedAssets) /
                            maximumFixedAssets) *
                          100
                        return (
                          <td key={companyId} className="border p-2">
                            {company
                              ? `₹${company.fixedAssets.toLocaleString()}Cr`
                              : "-"}
                            <br />
                            <div className="text-xs float-right text-red-500">
                              {company.fixedAssets == maximumFixedAssets ? (
                                <p className="text-green-600">0</p>
                              ) : (
                                `-${percentDecrease.toFixed(2)}%`
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>

                    {/* Revenue Growth QoQ */}
                    <tr>
                      <td className="border p-2 font-medium">
                        Revenue Growth (QoQ)
                      </td>
                      {selectedCompanies.map((companyId) => {
                        const company = getSelectedCompanyData(companyId)
                        const growth = company
                          ? getRevenueGrowth(company)
                          : { qoq: 0 }
                        return (
                          <td
                            key={companyId}
                            className={`border p-2 ${
                              growth.qoq >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {company ? `${growth.qoq.toFixed(2)}%` : "-"}
                          </td>
                        )
                      })}
                    </tr>

                    {/* Revenue Growth YoY */}
                    <tr>
                      <td className="border p-2 font-medium">
                        Revenue Growth (YoY)
                      </td>
                      {selectedCompanies.map((companyId) => {
                        const company = getSelectedCompanyData(companyId)
                        const growth = company
                          ? getRevenueGrowth(company)
                          : { yoy: 0 }
                        return (
                          <td
                            key={companyId}
                            className={`border p-2 ${
                              growth.yoy >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {company ? `${growth.yoy.toFixed(2)}%` : "-"}
                          </td>
                        )
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full rounded-xl my-8">
            <p className="w-fit h-10">Revenue Comparison</p>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  width={500}
                  height={300}
                  data={revenueChartData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="current"
                    fill="#8884d8"
                    name="Current Revenue"
                    activeBar={<Rectangle fill="#8884e8" stroke="blue" />}
                  />
                  <Bar
                    dataKey="previousQuarter"
                    fill="#82ca9d"
                    name="Previous Quarter"
                    activeBar={<Rectangle fill="#82ca7d" stroke="green" />}
                  />
                  <Bar
                    dataKey="previousYear"
                    fill="#ffc658"
                    name="Previous Year"
                    activeBar={<Rectangle fill="#ffb658" stroke="orange-red" />}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      {selectedCompanies.length > 0 && (
        <footer className="mt-16 py-8 border-t w-full">
          <span className=" flex flex-row px-4 text-center font-semibold">
            <p className="text-red-600">*</p>
            <p className="text-gray-400 ">
              All of the financial data has been mocked for the sake of this
              assignment
            </p>
          </span>
        </footer>
      )}
    </div>
  )
}

const MotionProv = ({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 1.05 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
export default CompanyComparison
