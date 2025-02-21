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

export async function initializeDatabase() {
	console.log("Initializing DuckDB...");

	// Select the appropriate Wasm bundle
	const bundle = await duckdb.selectBundle(DUCKDB_BUNDLES);
	const worker = new Worker(bundle.mainWorker!);
	const logger = new duckdb.ConsoleLogger();
	const database = new duckdb.AsyncDuckDB(logger, worker);
	await database.instantiate(bundle.mainModule, bundle.pthreadWorker);

	console.log("DuckDB-Wasm initialized successfully.");
	return database;
}

export async function connectToMotherDuck() {
	console.log("Connecting to MotherDuck...");
	const mdConnection = MDConnection.create({ mdToken: MD_API_TOKEN });
	console.log("Connected to MotherDuck.");
	return mdConnection;
}

export async function fetchAndCacheData(
	database: duckdb.AsyncDuckDB,
	mdConnection: MDConnection
) {
	console.log("Fetching data from MotherDuck...");

	const mdResult = await mdConnection.evaluateQuery(
		"SELECT * FROM duck.ducks"
	);
	const duckData = mdResult.data.toRows();
	console.log("Successfully fetched data from MotherDuck:", duckData);

	// Convert BigInt values to strings before storing
	const replacer = (key: string, value: any) =>
		typeof value === "bigint" ? value.toString() : value;

	// Cache data into DuckDB-Wasm
	await database.registerFileText(
		"rows.json",
		JSON.stringify(duckData, replacer)
	);

	const conn = await database.connect();
	await conn.insertJSONFromPath("rows.json", { name: "ducks" });
	console.log("Cached duck dataset into DuckDB-Wasm.");
}
