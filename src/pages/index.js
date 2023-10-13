import React, { useEffect, useState } from "react";
import PublicGoogleSheetsParser from "public-google-sheets-parser";
import Form from "../components/Form";

function linkify(text) {
  let urlPattern =
    /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;

  return text.replace(urlPattern, function (url) {
    return '<a href="' + url + '">' + url + "</a>";
  });
}

export default function App() {
  const [dynamicQuestions, setDynamicQuestions] = useState({});
  const [questionFlow, setQuestionFlow] = useState({});
  const onSubmit = (data) => {
    alert(JSON.stringify(data, null, 4));
  };

  // https://docs.google.com/spreadsheets/d/1S9Ac06eAesmc4J8mgEdO6A083H2sfkPKEk7sbg3USGY/edit#gid=774227821
  useEffect(() => {
    const parser = new PublicGoogleSheetsParser();
    const tempFlow = { prev: {}, next: {} };
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
        items.forEach((item) => {
          const question = {
            ...item,
            Options: Object.keys(item)
              .filter((key) => key.startsWith("A"))
              .map((key) => {
                const rawOption = item[key].trim();
                const match = rawOption.match(/^(.*?)\s*{{(.*?)}}$/);
                if (match) {
                  const key = match[1].trim();
                  const value = match[2].trim();
                  return { [key]: value };
                }
                return { [rawOption]: rawOption };
              }),
          };
          questions.dynamic[item["Unique ID"]] = question;
          questions.static.push(question);
        });
        console.log(questions);
      });
  }, []);

  return (
    <>
      {/* <Form
        data={Object.values(dynamicQuestions)}
        onSubmit={onSubmit}
        questionFlow={questionFlow}
      /> */}
    </>
  );
}
