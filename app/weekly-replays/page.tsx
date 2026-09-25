import Dropdown from "../_components/dropdown"
import { Video } from "../_components/local_video";

export default function WeeklyReplaysPage() {
    return (
        <div>
            <Dropdown option={['Week 1', 'Week 2', 'Week 3']} defaultOption="Select Week" />
        </div>
    );
}