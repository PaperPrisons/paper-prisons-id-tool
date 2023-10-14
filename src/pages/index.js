import React, { useEffect, useState } from "react";
import PublicGoogleSheetsParser from "public-google-sheets-parser";
import Form from "../components/Form";

export default function App() {
  const [questions, setQuestions] = useState({});

  // https://docs.google.com/spreadsheets/d/1S9Ac06eAesmc4J8mgEdO6A083H2sfkPKEk7sbg3USGY/edit#gid=774227821
  useEffect(() => {
    const parser = new PublicGoogleSheetsParser();
    parser
      .parse(
        "1S9Ac06eAesmc4J8mgEdO6A083H2sfkPKEk7sbg3USGY",
        "Questions-Cloned-Yabo"
      )
      .then((items) => {
        const questions = {
          static: [],
          dynamic: {},
        };
        items.forEach((item, index) => {
          const question = {
            id: item["Unique ID"],
            staticId: index,
            title: item.Question,
            type: item.Type,
            flowType: item.QuestionFlowType,
            options: Object.keys(item)
              .filter((key) => key.startsWith("A"))
              .map((key) => {
                const rawOption = item[key].trim();
                const match = rawOption.match(/^(.*?)\s*{{(.*?)}}$/);
                if (match) {
                  const key = match[1].trim();
                  const value = match[2].trim();
                  return { label: key, value: value };
                }
                return { label: rawOption, value: rawOption };
              }),
          };
          questions.dynamic[item["Unique ID"]] = question;
          if (item.QuestionFlowType === "Static") {
            questions.static.push(question);
          }
        });
        setQuestions(questions);
      });
  }, []);

  return (
    <>
      <Form data={questions} />
    </>
  );
}
