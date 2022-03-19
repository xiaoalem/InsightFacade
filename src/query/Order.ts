export function doOrders (entries: any[], order: any): Promise<any[]> {
	if (typeof order === "string") {
		return Promise.resolve(mergeSort(entries, order));
	}
	const dir = order.dir;
	const keys: string[] = order.keys;
	const result = mergeSort(entries, keys);
	if (dir === "UP") {
		return Promise.resolve(result);
	}
	return Promise.resolve(result.reverse());
}


export function mergeSort(entries: any[], order_key: any): any[] {
	if (entries.length <= 1) {
		return entries;
	}
	return entries.sort((prev, cur) => {
		if (typeof order_key === "string") {
			if (prev[order_key] < cur[order_key]) {
				return -1;
			}
			if (prev[order_key] > cur[order_key]) {
				return 1;
			}
			return 0;
		}
		for (const key of order_key) {
			if (prev[key] < cur[key]) {
				return -1;
			}
			if (prev[key] > cur[key]) {
				return 1;
			}
		}
		return 0;
	});
}
