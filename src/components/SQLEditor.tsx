"use client";

import { useEffect, useState } from "react";
import * as duckdb from "@duckdb/duckdb-wasm";
import { MDConnection } from "@motherduck/wasm-client";
import duckdb_wasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm";
import duckdb_wasm_next from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm";
import { MD_API_TOKEN } from "@/const";

const DUCKDB_BUNDLES: duckdb.DuckDBBundles = {
	mvp: {
		mainModule: duckdb_wasm,
		mainWorker: new URL(
			"@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js",
			import.meta.url
		).toString(),
	},
	eh: {
		mainModule: duckdb_wasm_next,
		mainWorker: new URL(
			"@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js",
			import.meta.url
		).toString(),
	},
};

const questions = [
	{
		id: 1,
		question:
			"Write a query to select all columns from a table named 'ducks'.",
		answer: "SELECT * FROM rows",
	},
	{
		id: 2,
		question:
			"Write a query to count the number of rows in a table named 'orders'.",
		answer: "SELECT COUNT(*) FROM orders",
	},
	{
		id: 3,
		question:
			"Write a query to select distinct values from a column named 'category' in a table named 'products'.",
		answer: "SELECT DISTINCT category FROM products",
	},
	// Add more questions as needed
];

export default function SQLEditor() {
	const [db, setDb] = useState<duckdb.AsyncDuckDB | null>(null);
	const [mdConn, setMdConn] = useState<MDConnection | null>(null);
	const [currentQuestion, setCurrentQuestion] = useState(0);
	const [score, setScore] = useState(0);

	const [query, setQuery] = useState("");
	const [results, setResults] = useState<any[]>([]);
	const [feedback, setFeedback] = useState("");
	const [showNextButton, setShowNextButton] = useState(false);

	useEffect(() => {
		async function initDB() {
			try {
				console.log("Initializing DuckDB...");
				const bundle = await duckdb.selectBundle(DUCKDB_BUNDLES);
				const worker = new Worker(bundle.mainWorker!);
				const logger = new duckdb.ConsoleLogger();
				const database = new duckdb.AsyncDuckDB(logger, worker);
				await database.instantiate(
					bundle.mainModule,
					bundle.pthreadWorker
				);
				setDb(database);

				// Connect to MotherDuck
				const mdConnection = MDConnection.create({
					mdToken: MD_API_TOKEN,
				});
				setMdConn(mdConnection);
				console.log("Connected to MotherDuck");

				// Fetch dataset from MotherDuck
				const mdResult = await mdConnection.evaluateQuery(
					"SELECT * FROM duck.ducks"
				);
				const duckData = mdResult.data.toRows();

				console.log("Successfully fetched data from MD:", duckData);

				const replacer = (key: string, value: any) =>
					typeof value === "bigint" ? value.toString() : value;

				// Cache data into DuckDB-Wasm
				await database.registerFileText(
					"rows.json",
					JSON.stringify(duckData, replacer)
				);

				const conn = await database.connect();
				await conn.insertJSONFromPath("rows.json", { name: "ducks" });
				console.log("Cached duck dataset into DuckDB-Wasm");

				// Test query to verify data is cached
				const testResult2 = await conn.query(
					"SELECT * FROM rows LIMIT 5"
				);

				setResults(testResult2.toArray());
			} catch (error) {
				console.error("Error initializing DuckDB:", error);
			}
		}
		initDB();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!db || !query.trim()) return;
		setFeedback("");
		try {
			const conn = await db.connect();
			const result = await conn.query(query);
			setResults(result.toArray());
			if (
				query.toLowerCase().replace(/\s+/g, "") ===
				questions[currentQuestion].answer
					.toLowerCase()
					.replace(/\s+/g, "")
			) {
				setScore(score + 1);
				setFeedback("Correct! Great job!");
				setShowNextButton(true);
			} else {
				setFeedback("Incorrect. Try again!");
			}
		} catch (err) {
			setFeedback(
				`Error executing query: ${err.message}. Please try again.`
			);
		}
	};

	const handleNextQuestion = () => {
		if (currentQuestion < questions.length - 1) {
			setCurrentQuestion(currentQuestion + 1);
			setQuery("");
			setFeedback("");
			setResults([]);
			setShowNextButton(false);
		} else {
			setFeedback("Congratulations! You've completed all questions.");
		}
	};

	return (
		<main className="p-4 font-mono bg-white text-black min-h-screen">
			<h1 className="text-2xl font-bold mb-4">SQL Query Interface</h1>
			<div className="text-lg">Score: {score}</div>
			<div className="bg-gray-100 p-4 rounded">
				<div className="font-bold mb-2">
					Question {currentQuestion + 1}:
				</div>
				<div>{questions[currentQuestion].question}</div>
			</div>
			<form onSubmit={handleSubmit} className="mb-4">
				<textarea
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					className="w-full p-2 border border-gray-300 rounded mb-2 font-mono"
					rows={5}
					placeholder="Enter your SQL query here..."
				/>
				<button
					type="submit"
					className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
				>
					Submit Answer
				</button>
			</form>
			{feedback && (
				<div
					className={`p-2 rounded ${
						feedback.includes("Correct")
							? "bg-green-100 text-green-800"
							: "bg-red-100 text-red-800"
					}`}
				>
					{feedback}
				</div>
			)}
			{results && results[0] && (
				<div className="overflow-x-auto">
					<table className="w-full border-collapse border border-gray-300">
						<thead>
							<tr className="bg-gray-100">
								{Object.keys(results[0]).map((key) => (
									<th
										key={key}
										className="border border-gray-300 p-2 text-left"
									>
										{key}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{results.map((row, i) => (
								<tr
									key={i}
									className={i % 2 === 0 ? "bg-gray-50" : ""}
								>
									{Object.values(row).map((value: any, j) => (
										<td
											key={j}
											className="border border-gray-300 p-2"
										>
											{value?.toString() ?? "NULL"}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			{showNextButton && (
				<button
					onClick={handleNextQuestion}
					className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
				>
					Next Question
				</button>
			)}
		</main>
	);
}
