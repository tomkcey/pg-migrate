import { constants } from "./utils";

export type Direction = typeof constants.UP | typeof constants.DOWN;

export interface Migration {
    name: string;
    createdAt: Date;
    direction?: Direction;
}

export interface Logger {
    info(message: string): void;
    error(message: string): void;
}
