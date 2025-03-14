import React, { FC, useContext } from "react";
import styled, { useTheme } from "styled-components";
import { TitleAndClose } from "./components/TitleAndClose";
import { AiOutlineCloudDownload } from "react-icons/ai";
import { SimbriefClient, SimbriefOfp } from "@microsoft/msfs-sdk";
import { FlightContext } from "../../lib/FlightContext";
import { useSetting } from "../../hooks/useSettings";
import ScrollContainer from "react-indiana-drag-scroll";
import { ModalContext } from "../../";
import { CancelConfirmModal } from "../../components/CancelConfirmModal";

export const Flight: FC<{ onUplink: (ofp: SimbriefOfp) => void; onClose: () => void }> = ({ onUplink, onClose }) => {
    const { ofp, setOfp } = useContext(FlightContext);
    const { setModal } = useContext(ModalContext);

    const [simbriefUsername] = useSetting("boeingMsfsSimbriefUsername");

    const theme = useTheme();

    const newFlightModal = (
        <CancelConfirmModal
            title="Create New Flight?"
            description="Creating a new flight will remove your current airports,
                routes, and chart selections."
            confirmText="Create"
            onConfirm={() => setOfp(null)}
        />
    );

    const handleClickUplink = async () => {
        const newOfp = await SimbriefClient.getOfp(await SimbriefClient.getSimbriefUserIDFromUsername(simbriefUsername as string));
        setOfp(newOfp);
        onUplink(newOfp);
    };

    // TODO: make this return route instead of every fix
    const navlogToRoute = (ofp: SimbriefOfp): string[] => {
        const arr = [];

        const last = ofp.navlog.fix.length - 1;
        const depString =
            parseInt(ofp.navlog.fix[0].is_sid_star) === 1 ? `RW${ofp.origin.plan_rwy}.${ofp.navlog.fix[0].via_airway}` : `${ofp.origin.plan_rwy}`;
        const arrString =
            parseInt(ofp.navlog.fix[last].is_sid_star) === 1
                ? `RW${ofp.destination.plan_rwy}.${ofp.navlog.fix[last].via_airway}`
                : `${ofp.destination.plan_rwy}`;

        arr.push(depString);

        for (const fix of ofp.navlog.fix) {
            if (fix.ident !== "TOC" && fix.ident !== "TOD" && parseInt(fix.is_sid_star) !== 1) {
                arr.push(fix.ident);
            }
        }

        arr.push(arrString);

        return arr;
    };

    return (
        <>
            <FlightContainer>
                <TitleAndClose label="Flight" onClose={onClose} />
                <FlightButtons>
                    <div onClick={() => setModal(newFlightModal)}>New Flight</div>
                    <div onClick={handleClickUplink}>
                        <AiOutlineCloudDownload size={45} color={theme.text} style={{ padding: 0, margin: 0 }} />
                    </div>
                </FlightButtons>
                <RouteContainer>
                    <FlightColumn label="ORIGIN" height={50} items={ofp && [<InputItem>{ofp.origin.icao_code}</InputItem>]} />
                    <FlightColumn label="ARRIVAL" height={50} items={ofp && [<InputItem>{ofp.destination.icao_code}</InputItem>]} />
                    <FlightColumn
                        label="NAVAIDS, WAYPOINTS, AIRWAYS"
                        height={300}
                        items={ofp && navlogToRoute(ofp).map((item, i) => <InputItem key={i}>{item}</InputItem>)}
                    />
                    <FlightColumn
                        label="ALTERNATES"
                        height={125}
                        items={ofp && "icao_code" in ofp.alternate ? [<InputItem>{ofp.alternate.icao_code}</InputItem>] : null}
                    />
                </RouteContainer>
            </FlightContainer>
        </>
    );
};

type FlightColumnProps = {
    label: string;
    height: number;
    items?: React.ReactNode[] | null;
};

const FlightColumn: FC<FlightColumnProps> = ({ label, height, items }) => (
    <InfoContainer>
        <InfoLabel>{label}</InfoLabel>
        <ScrollContainer>
            <FlightColumnInner height={height} multiple={items ? items.length > 1 : false}>
                {items}
            </FlightColumnInner>
        </ScrollContainer>
    </InfoContainer>
);

type FlightColumnInnerProps = { height: number; multiple: boolean };

const FlightColumnInner = styled.div`
    display: flex;
    height: ${(props: FlightColumnInnerProps) => props.height}px;
    flex-flow: row wrap;
    overflow: hidden;
    align-items: ${(props: FlightColumnInnerProps) => (props.multiple ? "start" : "center")};
    ${(props: FlightColumnInnerProps) => props.multiple && "align-content: flex-start;"};
`;

const InputItem = styled.div`
    padding: 6px 15px;
    font-size: 24px;
    margin: 5px;
    background: #607184;
    color: white;
    border-radius: 30px;
    font-weight: 500;
    flex: 0 0;
    align-self: start;
`;

const InfoContainer = styled.div`
    display: flex;
    flex-direction: column;
    padding: 10px;
    border-bottom: 1px solid ${(props) => props.theme.border};
    background: ${(props) => props.theme.invert.primary};
`;

const InfoLabel = styled.div`
    color: gray;
    font-size: 18px;
    margin: 5px;
`;

const RouteContainer = styled.div`
    width: 98%;
    background: white;
    display: flex;
    flex-direction: column;
    border-radius: 15px;
`;

const FlightButtons = styled.div`
    width: 100%;
    display: flex;
    justify-content: space-between;
    color: ${(props) => props.theme.text};

    div {
        margin: 20px;
        font-size: 24px;
        font-weight: 500;
        border-radius: 8px;
        padding: 5px 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        background: ${(props) => props.theme.invert.primary};
    }
`;

const FlightContainer = styled.div`
    width: 500px;
    height: 100%;
    position: absolute;
    background: ${(props) => props.theme.invert.bg};
    display: flex;
    flex-direction: column;
    align-items: center;
    color: black;
`;
