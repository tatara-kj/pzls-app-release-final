import React from "react";
import { ActivityIndicator, Text, ScrollView } from "react-native";

import { useDocument } from "@nandorojo/swr-firestore";

import EntriesList from "@/components/EntriesList";
import ResultsTable from "@/components/ResultsTable";
import YouTubePlayer from "@/components/YouTubePlayer";
import { EventDetails } from "functions/src/types/EventDetails";

type Props = { eventId: string };

export default function EventDetailsScreen({ eventId }: Props) {
  const { data: details, loading } = useDocument<EventDetails>(
    `eventDetails/${eventId}`
  );

  if (loading || !details) return <ActivityIndicator size="large" />;

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      {details.entries?.length ? (
        <EntriesList data={details.entries} />
      ) : (
        <Text>Lista startowa niedostępna…</Text>
      )}

      {details.results?.length ? (
        <ResultsTable data={details.results} />
      ) : (
        <Text>Wyniki jeszcze się nie pojawiły…</Text>
      )}

      {details.youtube ? (
        <YouTubePlayer url={details.youtube} />
      ) : (
        <Text>Brak transmisji video.</Text>
      )}
    </ScrollView>
  );
}
