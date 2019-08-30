import { useRef } from "react";
import { getStreams } from "../services/Streams";

export const NewMessage = ({ streamName }) => {
    const text = useRef(null);
    return (
        <form
            onSubmit={async e => {
                e.preventDefault();
                const message = {
                    text: text.current.value
                };
                text.current.value = "";
                await getStreams().createMessage(streamName, message);
            }}
        >
            <input
                ref={text}
                placeholder="new message"
                style={{
                    width: "100%",
                    padding: "1rem",
                    borderRadius: "none",
                    border: "none",
                    borderTop: "1px solid lightgray"
                }}
            />
        </form>
    );
};
