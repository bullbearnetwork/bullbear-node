import { ExceptionsManager } from '../helpers';

const allExceptionCreator: Array<(exc: ExceptionsManager) => Promise<void>> = [];

export { allExceptionCreator };
