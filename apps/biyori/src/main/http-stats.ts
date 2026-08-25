const startedAt = Date.now();

let connectionsSucceeded = 0;
let connectionsFailed = 0;

export function appUptimeSeconds(): number {
	return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

export function connectionCounts(): {
	succeeded: number;
	failed: number;
} {
	return {
		succeeded: connectionsSucceeded,
		failed: connectionsFailed,
	};
}

export async function trackedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
	try {
		const response = await fetch(input, init);
		if (response.ok) {
			connectionsSucceeded += 1;
		} else {
			connectionsFailed += 1;
		}
		return response;
	} catch (error) {
		connectionsFailed += 1;
		throw error;
	}
}
