import { StreamsProvider } from "../../../../components/StreamsProvider";
import { useRouter } from "next/router";
import { StreamComponent } from "../../../../components/Stream";
import { goTo } from "../../../../utils/router";

export default () => {
    const router = useRouter();
    return <StreamsProvider>{router.query.id && <StreamComponent {...(router.query as any)} goTo={goTo(router, { id: undefined, epriv: undefined })} />}</StreamsProvider>;
};

