import constants from "./constants.ts";

const auto = constants.env !== "production";
const callbacks = [() => true, () => false] as const;

export default {
	_canvas:
		(await import("@napi-rs/canvas").then(...callbacks)) &&
		(await import("chart.js").then(...callbacks)),
	autosTypeInChat: auto,
	botRunTestingServer: auto,
	executeCaesar: auto,
	executeCoinFlip: auto,
	formsPingForAppeals: auto,
	joinsAutoKick: auto,
	joinsDmRevision: auto,
	threadsTestingServer: auto,
	ticketsPingForReports: auto,
};
