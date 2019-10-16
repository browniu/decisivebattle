export default async function flattenPromise(promiseFn) {
    let result;
    let error;
    try {
        result = await promiseFn();
    } catch (err) {
        error = err;
    }
    return [result, error];
}
