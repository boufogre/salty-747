// Copyright (c) 2023-2024 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

import React, { useContext, useEffect, useRef, useState } from "react";
import { CanvasConst } from "./Constants";
import styled, { css } from "styled-components";
import { ThemeSwitchContext } from "instruments/src/EFB/lib/Theme";

export interface AirframePerformanceEnvelope {
    mlw: number[][];
    mzfw: number[][];
    mtow: number[][];
    flight: number[][];
}

export interface ChartLimitsWeights {
    min: number;
    max: number;
    lines: number;
    scale: number;
    values: number[];
}

export interface ChartLimitsCG {
    angleRad: number;
    min: number;
    max: number;
    overlap: number;
    highlight: number;
    lines: number;
    scale: number;
    values: number[];
}

export interface ChartLimitsLabels {
    mtow: ChartLimitsLabelsValue;
    mlw: ChartLimitsLabelsValue;
    mzfw: ChartLimitsLabelsValue;
}

export interface ChartLimitsLabelsValue {
    x1: number;
    x2: number;
    y: number;
}

export interface PayloadChartLimits {
    weight: ChartLimitsWeights;
    cg: ChartLimitsCG;
    labels: ChartLimitsLabels;
}

interface ChartWidgetProps {
    width: number;
    height: number;
    envelope: AirframePerformanceEnvelope;
    limits: PayloadChartLimits;
    gw: number;
    cg: number;
    mldw: number;
    mldwCg: number;
    zfw: number;
    zfwCg: number;
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({ width, height, envelope, limits, gw, cg, mldw, mldwCg, zfw, zfwCg }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
    const { theme } = useContext(ThemeSwitchContext);
    const metric = SimVar.GetGameVarValue("GAME UNIT IS METRIC", "boolean");

    const getTheme = (theme: string): [string, string, string, string] => {
        let base = "#fff";
        let primary = "#00C9E4";
        let secondary = "#84CC16";
        let alt = "#000";
        switch (theme) {
            case "dark":
                base = "#fff";
                primary = "#4fa0fc";
                secondary = "#84CC16";
                alt = "#000";
                break;
            case "light":
                base = "#000";
                primary = "#4fa0fc";
                secondary = "#84CC16";
                alt = "#fff";
                break;
            default:
                break;
        }
        return [base, primary, secondary, alt];
    };

    const draw = () => {
        if (!ctx) return;

        const [base, primary, secondary, alt] = getTheme(theme);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = "#C9C9C9";
        ctx.strokeStyle = "#2B313B";
        ctx.lineWidth = 1;

        const yStep = height / limits.weight.lines;
        const xStep = width / limits.cg.lines;
        const shiftX = width / 18;

        const weightToY = (weight: number) => ((limits.weight.max - weight) * yStep) / limits.weight.scale;
        const cgToX = (cg: number) => (cg - limits.cg.min) * xStep;
        const cgWeightToXY = (cg: number, weight: number): [number, number] => {
            const xStart = cgToX(cg);
            const y = weightToY(weight);
            const x = shiftX + xStart + (CanvasConst.yScale - y) * Math.tan((15 / 16) * Math.PI + (cg - limits.cg.min) * limits.cg.angleRad);
            return [x, y];
        };

        const drawWeightLines = () => {
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#394049";
            for (let y = yStep; y < height; y += yStep) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.closePath();
                ctx.stroke();
            }
        };

        const drawCgLines = () => {
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.25;
            const cgWidth = width - shiftX;
            for (let cgPercent = limits.cg.min, x = 0; x < cgWidth; x += xStep, cgPercent++) {
                if (x > 0 && x < cgWidth) {
                    ctx.lineWidth = cgPercent % limits.cg.highlight ? 0.25 : 1;
                    ctx.strokeStyle = cgPercent % limits.cg.highlight ? "#2B313B" : "#394049";

                    const [x1, y1] = cgWeightToXY(cgPercent, limits.weight.min);
                    const [x2, y2] = cgWeightToXY(cgPercent, limits.weight.max);
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.closePath();
                    ctx.stroke();
                }
            }
            ctx.globalAlpha = 1;
        };

        const drawMzfw = () => {
            ctx.lineWidth = 2;
            ctx.strokeStyle = base;
            const mzfw = envelope.mzfw;
            const [x, y] = cgWeightToXY(mzfw[0][0], mzfw[0][1]);
            ctx.beginPath();
            ctx.moveTo(x, y);
            for (let i = 1; i < mzfw.length; i++) {
                const [x, y] = cgWeightToXY(mzfw[i][0], mzfw[i][1]);
                ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.closePath();
        };

        const drawMlw = () => {
            ctx.lineWidth = 4;
            ctx.strokeStyle = secondary;
            const mlw = envelope.mlw;
            const [x, y] = cgWeightToXY(mlw[0][0], mlw[0][1]);
            ctx.beginPath();
            ctx.moveTo(x, y);
            for (let i = 1; i < mlw.length; i++) {
                const [x, y] = cgWeightToXY(mlw[i][0], mlw[i][1]);
                ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
        };

        const drawMtow = () => {
            ctx.lineWidth = 4;
            ctx.strokeStyle = primary;
            const mtow = envelope.mtow;
            const [x, y] = cgWeightToXY(mtow[0][0], mtow[0][1]);
            ctx.beginPath();
            ctx.moveTo(x, y);
            for (let i = 1; i < mtow.length; i++) {
                const [x, y] = cgWeightToXY(mtow[i][0], mtow[i][1]);
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        };

        const drawFlight = () => {
            ctx.lineWidth = 4;
            ctx.strokeStyle = primary;
            const mtow = envelope.flight;
            const [x, y] = cgWeightToXY(mtow[0][0], mtow[0][1]);
            ctx.beginPath();
            ctx.moveTo(x, y);
            for (let i = 1; i < mtow.length; i++) {
                const [x, y] = cgWeightToXY(mtow[i][0], mtow[i][1]);
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        };

        const drawPoints = () => {
            const drawDiamond = (cg: number, weight: number, color: string) => {
                ctx.fillStyle = color;
                ctx.strokeStyle = alt;
                ctx.lineWidth = 1;
                ctx.beginPath();
                const [cgX, cgY] = cgWeightToXY(cg, weight);
                ctx.moveTo(cgX, cgY - CanvasConst.diamondHeight);
                ctx.lineTo(cgX - CanvasConst.diamondWidth, cgY);
                ctx.lineTo(cgX, cgY + CanvasConst.diamondHeight);
                ctx.lineTo(cgX + CanvasConst.diamondWidth, cgY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            };

            // MLW
            drawDiamond(mldwCg, mldw, secondary);
            // MTOW
            drawDiamond(cg, gw, primary);
            // MZFW
            drawDiamond(zfwCg, zfw, base);
        };

        drawWeightLines();
        drawCgLines();
        drawMzfw();
        drawMlw();
        drawMtow();
        drawPoints();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        let frameId: any;

        if (!canvas) {
            return undefined;
        }

        const w = width;
        const h = height;
        const { devicePixelRatio: ratio = 1 } = window;
        setCtx(canvas.getContext("2d"));
        canvas.width = w * ratio;
        canvas.height = h * ratio;
        ctx?.scale(ratio, ratio);

        const render = () => {
            draw();
            // workaround for rendering bug
            if (!frameId || frameId < 10) {
                frameId = window.requestAnimationFrame(render);
            }
        };

        render();

        return () => {
            if (frameId) {
                window.cancelAnimationFrame(frameId);
            }
        };
    }, [draw]);

    const mtow = {
        transform: `translateX(${(zfwCg < limits.cg.overlap ? limits.labels.mtow.x1 : limits.labels.mtow.x2) * width}px) translateY(${
            height * limits.labels.mtow.y
        }px)`,
    };
    const mlw = {
        transform: `translateX(${(zfwCg < limits.cg.overlap ? limits.labels.mlw.x1 : limits.labels.mlw.x2) * width}px) translateY(${
            height * limits.labels.mlw.y
        }px)`,
    };
    const mzfw = {
        transform: `translateX(${(zfwCg < limits.cg.overlap ? limits.labels.mzfw.x1 : limits.labels.mzfw.x2) * width}px) translateY(${
            height * limits.labels.mzfw.y
        }px)`,
    };

    const [cgRows, setCgRows] = useState<Object[]>([]);
    const [weightRows, setWeightRows] = useState<Object[]>([]);

    const weightUnits = {
        transform: `translateX(${CanvasConst.weightAxis.units.x * width}px) translateY(${CanvasConst.weightAxis.units.y * height}px)`,
    };

    useEffect(() => {
        const cg: Object[] = [];
        for (let i = 0; i < limits.cg.values.length; i++) {
            const newRow = {
                transform: `translateX(${(CanvasConst.cgAxis.xOffset + i * CanvasConst.cgAxis.xSpacing) * width}px) translateY(${
                    height * CanvasConst.cgAxis.y
                }px)`,
            };
            cg.push(newRow);
        }
        setCgRows(cg);
        const wg: Object[] = [];
        for (let i = 0; i < limits.weight.values.length; i++) {
            const newRow = {
                transform: `translateX(${CanvasConst.weightAxis.x * width}px) translateY(${
                    height * (CanvasConst.weightAxis.yOffset + i * CanvasConst.weightAxis.ySpacing)
                }px)`,
            };
            wg.push(newRow);
        }
        setWeightRows(wg);
    }, []);

    const cgAxis = cgRows.map((cgRow, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <LabelP key={`cgRow-${i}`} style={cgRow}>{`${limits.cg.values[i]}%`}</LabelP>
    ));
    const weightAxis = weightRows.map((weightRow, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <LabelP key={`weightRow-${i}`} style={weightRow}>
            {Math.round(metric ? (limits.weight.values[i] * 1000) / 1000 : ((limits.weight.values[i] * 1000) / 1000) * 2.205)}
        </LabelP>
    ));

    return (
        <div style={{ position: "relative" }}>
            <canvas ref={canvasRef} style={{ border: "1px solid lightgray" }} />
            {cgAxis}
            {weightAxis}
            <UnitP key="wu" className="absolute top-0 font-mono text-sm font-medium" style={weightUnits}>
                {metric ? "x 1000 kgs" : "x 1000 lbs"}
            </UnitP>
            <LabelP key="mtow" className="absolute top-0 font-mono font-medium text-theme-highlight drop-shadow" style={mtow}>
                MTOW
            </LabelP>
            <LabelP key="mldw" className="absolute top-0 font-mono font-medium text-lime-500" style={mlw}>
                MLW
            </LabelP>
            <LabelP key="mzfw" className="absolute top-0 font-mono font-medium text-theme-text" style={mzfw}>
                MZFW
            </LabelP>
        </div>
    );
};

const p = css`
    color: ${(props) => props.theme.text};
    position: absolute;
    top: 0;
`;

const UnitP = styled.p`
    ${p}
    font-size: 16px;
`;

const LabelP = styled.p`
    ${p}
    font-size: 22px;
`;
