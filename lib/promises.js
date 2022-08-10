/**
 * Returns a generator that only gives the elements of an array that meet the condition specified in a callback function.
 *
 * @template T
 * @template X
 *
 * @param {T[] | import("discord.js").Collection<string, T>} array - Array to filter.
 * @param {(value: T, index: number, array: T[]) => Promise<X | false> | X | false} predicate - A function to asynchronously test each
 *   element for a condition.
 *
 * @returns {AsyncGenerator<Awaited<X>, void, unknown>}
 */
export async function* asyncFilter(array, predicate) {
	let index = 0;
	for (const value of array.values()) {
		const newValue = await predicate(value, index, [...array.values()]);
		if (newValue !== false) yield newValue;
		index++;
	}
	return;
}

/**
 * Resolves a promise when any of the promises resolve with a specified value.
 *
 * @author <https://stackoverflow.com/a/51160727/11866686>
 *
 * @param {Promise<any>[]} promises - The promises to watch.
 *
 * @returns {Promise<boolean>} - Returns a promise that resolves to `true` as soon as any of the promises resolve with the specified value,
 *   or resolves to `false` if all of the promises resolve with a different value.
 */
export async function firstTrueyPromise(promises) {
	const newPromises = promises.map(
		async (promise) =>
			await new Promise((resolve, reject) => {
				promise
					.then((resolved) => {
						if (resolved) {
							resolve(true);

							return true;
						}

						return false;
					})
					.catch(reject);
			}),
	);

	newPromises.push(Promise.all(promises).then(() => false));

	return await Promise.race(newPromises);
}
