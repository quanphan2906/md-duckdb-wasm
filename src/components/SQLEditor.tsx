"use client";

import { useEffect, useState } from "react";
import * as duckdb from "@duckdb/duckdb-wasm";
import {
	initializeDatabase,
	connectToMotherDuck,
	fetchAndCacheData,
} from "@/utils/dbUtils";

export default function SQLEditor() {
	const [db, setDb] = useState<duckdb.AsyncDuckDB | null>(null);
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<any[]>([]);
	const [feedback, setFeedback] = useState("");

	useEffect(() => {
		async function initDB() {
			try {
				const database = await initializeDatabase();
				setDb(database);

				const mdConnection = await connectToMotherDuck();
				await fetchAndCacheData(database, mdConnection);
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
		} catch (err) {
			setFeedback(
				`Error executing query: ${err.message}. Please try again.`
			);
		}
	};

	return (
		<main className="p-4 font-mono bg-white text-black min-h-screen">
			<h1 className="text-2xl font-bold mb-4">SQL Query Interface</h1>

			{/* SQL Editor (Top Section) */}
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
					Run query
				</button>
			</form>

			{/* Query Results Display (Bottom Section) */}
			<div className="flex-grow overflow-auto">
				{feedback && (
					<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
						<strong className="font-bold">Error:</strong>
						<span className="block sm:inline"> {feedback}</span>
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
										className={
											i % 2 === 0 ? "bg-gray-50" : ""
										}
									>
										{Object.values(row).map(
											(value: any, j) => (
												<td
													key={j}
													className="border border-gray-300 p-2"
												>
													{value?.toString() ??
														"NULL"}
												</td>
											)
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</main>
	);
}
