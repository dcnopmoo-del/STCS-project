import type { LearningPayload } from "@/lib/learning-tools";
import FlashcardViewer from "./FlashcardViewer";
import QuizRunner from "./QuizRunner";
import AnalogyCard from "./AnalogyCard";
import StudyPlanView from "./StudyPlanView";
import ConceptMap from "./ConceptMap";

const LearningRenderer = ({ data }: { data: LearningPayload }) => {
  switch (data.service) {
    case "flashcards": return <FlashcardViewer data={data.payload} />;
    case "quiz": return <QuizRunner data={data.payload} />;
    case "analogy": return <AnalogyCard data={data.payload} />;
    case "study_plan": return <StudyPlanView data={data.payload} />;
    case "concept_map": return <ConceptMap data={data.payload} />;
    default: return null;
  }
};

export default LearningRenderer;
