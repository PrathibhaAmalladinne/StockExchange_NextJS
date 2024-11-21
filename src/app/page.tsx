"use client"
import CompanyComparison from "@/components/companyComparison"

export default function Home() {
  return (
    <div className="min-h-screen my-12 rounded-xl w-full bg-gray-100 ">
      <header className=" p-3">
        <div className=" mx-auto px-4 my-8">
          <h1 className="text-4xl font-bold text-center ">
            Stock Exchange Analysis
          </h1>
          <p className="mt-2 text-center text-green-600 font-semibold text-lg">
            Compare the financial metrics of the listed companies and make
            informed investment decisions
          </p>
        </div>
      </header>

      <section className="container mx-auto px-4">
        <CompanyComparison />
      </section>
    </div>
  )
}
