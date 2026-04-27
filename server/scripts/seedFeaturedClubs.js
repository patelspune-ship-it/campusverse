// Populate rich profile data for the three featured clubs.
// Run with: node scripts/seedFeaturedClubs.js
// Idempotent — safe to run multiple times.
import "dotenv/config";
import mongoose from "mongoose";
import Club from "../models/Club.js";

await mongoose.connect(process.env.MONGO_URI, { dbName: "CampusVerseDB" });
console.log("✅ Connected\n");

const CLUBS = [
  {
    name: "ACES MITSOE",
    updates: {
      description:
        "For the Students, By the Students. We are not a Club, We are an Association. Committed to the principles of Unity, Support, and Dedication.\n\n" +
        "ACES, the oldest and largest club at MIT ADT University's School of Computing, is a vibrant techno-cultural organization established in 2018-19. It empowers students with opportunities that go beyond academics, nurturing leadership, technical expertise, and cultural interests. Renowned for its consistency and dynamic events, ACES fosters excellence while building a strong sense of community among students and faculty alike.\n\n" +
        "As an umbrella to other clubs within the School of Computing, ACES plays a pivotal role in bridging technology and culture. With its massive following and respected legacy, it provides a platform where students can thrive academically, socially, and creatively.",
      founded_year: 2018,
      category: "technical",
      core_team: [
        { name: "Aayush Dalvi",    role: "President" },
        { name: "Shivam Jha",      role: "Vice President" },
        { name: "Vedika Bhoite",   role: "Vice President" },
        { name: "Vedant Ghule",    role: "Joint Secretary" },
        { name: "Shivansh Sinha",  role: "Secretary" },
        { name: "Ishan",           role: "Treasurer" },
        { name: "Danika Patil",    role: "Public Relations Officer" },
        { name: "Aniket Panchal",  role: "Managing Director" },
      ],
      recruitment_open:    true,
      recruitment_contact: "aces.mitsoe@campusverse.in",
      recruitment_message: "Recruitment is now open! Reach out to apply.",
      profile_completed:   true,
    },
  },
  {
    name: "Cognisance",
    updates: {
      description:
        "As an Esports club, we live for adrenaline-fueled battles, LAN events, Gaming Tournaments, epic guest sessions and industry interaction. With a passion for Esports, we've got a spot for everyone.\n\n" +
        "Cognisance — where gaming passion meets camaraderie. This vibrant club ignites excitement and fosters a sense of belonging among gamers of all levels. With a motto centred around embracing the thrill of virtual adventure, Cognisance offers a diverse range of activities, from casual gaming sessions to competitive tournaments.",
      category: "technical",
      core_team: [
        { name: "Tanishq Goyal", role: "President" },
      ],
      recruitment_open:    true,
      recruitment_contact: "goyaltanishq99@gmail.com",
      recruitment_message: "Looking for passionate gamers — apply today!",
      profile_completed:   true,
    },
  },
  {
    name: "Cloud Computing Club",
    updates: {
      description:
        "The major objective of our group is to raise technical awareness of cloud and devops on our campus. We are an interdisciplinary cloud club, so rather than concentrating on just one cloud provider like AWS or GCP, we will cover a wide range of providers including IBM, Alibaba, and many more. Instead of offering more theoretical lectures, we will concentrate on bringing practical events. We make an effort to give our trainees practical, industrial experience.",
      category: "technical",
      core_team: [
        { name: "Mahati Kapuganty", role: "President" },
      ],
      recruitment_open:    true,
      recruitment_contact: "mahatikapuganty@gmail.com",
      recruitment_message: "Join us to explore cloud and DevOps hands-on.",
      profile_completed:   true,
    },
  },
];

for (const { name, updates } of CLUBS) {
  const result = await Club.findOneAndUpdate(
    { name: { $regex: new RegExp(`^${name}$`, "i") } },
    { $set: updates },
    { new: true }
  );
  if (result) {
    console.log(`✅ Updated: ${result.name}`);
  } else {
    console.warn(`⚠️  Club not found: "${name}" — skipped`);
  }
}

await mongoose.disconnect();
console.log("\nDone.");
