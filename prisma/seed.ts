import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Seed Health Tips
  const healthTips = [
    {
      title: 'Take Prenatal Vitamins Daily',
      content:
        "Prenatal vitamins containing folic acid, iron, and calcium are essential for your baby's development. Take them daily as recommended by your healthcare provider.",
      category: 'nutrition',
      pregnancyWeekMin: 1,
      pregnancyWeekMax: 40,
      tags: ['vitamins', 'nutrition', 'folic_acid'],
      language: 'en',
      priority: 5,
    },
    {
      title: 'Stay Hydrated',
      content:
        'Drink at least 8-10 glasses of water daily. Proper hydration helps prevent constipation, reduces swelling, and supports increased blood volume.',
      category: 'nutrition',
      pregnancyWeekMin: 1,
      pregnancyWeekMax: 40,
      tags: ['hydration', 'water', 'health'],
      language: 'en',
      priority: 4,
    },
    {
      title: 'Gentle Exercise is Beneficial',
      content:
        'Light exercise like walking, swimming, or prenatal yoga can help reduce back pain, improve mood, and prepare your body for labor.',
      category: 'exercise',
      pregnancyWeekMin: 1,
      pregnancyWeekMax: 36,
      tags: ['exercise', 'walking', 'yoga'],
      language: 'en',
      priority: 4,
    },
    {
      title: "Monitor Baby's Movements",
      content:
        "Around week 20, you'll start feeling baby movements. After week 28, track kick counts - you should feel at least 10 movements in 2 hours.",
      category: 'monitoring',
      pregnancyWeekMin: 20,
      pregnancyWeekMax: 40,
      tags: ['baby_movements', 'kick_counts', 'monitoring'],
      language: 'en',
      priority: 5,
    },
    {
      title: 'Get Adequate Sleep',
      content:
        'Aim for 7-9 hours of sleep per night. Use pregnancy pillows for comfort and try sleeping on your left side to improve blood flow.',
      category: 'wellness',
      pregnancyWeekMin: 1,
      pregnancyWeekMax: 40,
      tags: ['sleep', 'rest', 'comfort'],
      language: 'en',
      priority: 3,
    },
  ]

  for (const tip of healthTips) {
    await prisma.healthTip.create({ data: tip })
  }

  // Seed FAQs
  const faqs = [
    {
      question: 'Is it safe to exercise during pregnancy?',
      answer:
        'Yes, exercise is generally safe and beneficial during pregnancy. Light to moderate exercise like walking, swimming, and prenatal yoga can help reduce back pain, improve mood, and prepare your body for labor. Always consult your healthcare provider before starting any exercise routine.',
      category: 'exercise',
      pregnancyWeekMin: 1,
      pregnancyWeekMax: 40,
      tags: ['exercise', 'safety', 'fitness'],
      language: 'en',
      popularity: 15,
    },
    {
      question: 'What foods should I avoid during pregnancy?',
      answer:
        'Avoid raw or undercooked meats, fish high in mercury, unpasteurized dairy products, raw eggs, alcohol, and limit caffeine intake. Also avoid deli meats unless heated until steaming hot.',
      category: 'nutrition',
      pregnancyWeekMin: 1,
      pregnancyWeekMax: 40,
      tags: ['nutrition', 'food_safety', 'diet'],
      language: 'en',
      popularity: 20,
    },
    {
      question: 'How much weight should I gain during pregnancy?',
      answer:
        'Weight gain depends on your pre-pregnancy BMI. Generally: Normal weight (BMI 18.5-24.9): 25-35 lbs, Underweight (BMI <18.5): 28-40 lbs, Overweight (BMI 25-29.9): 15-25 lbs, Obese (BMI ≥30): 11-20 lbs.',
      category: 'health',
      pregnancyWeekMin: 1,
      pregnancyWeekMax: 40,
      tags: ['weight_gain', 'health', 'bmi'],
      language: 'en',
      popularity: 18,
    },
    {
      question: 'When should I call my doctor?',
      answer:
        'Call immediately for: severe bleeding, severe abdominal pain, persistent vomiting, severe headaches, vision changes, decreased baby movements after 28 weeks, signs of preterm labor, or fever over 100.4°F.',
      category: 'emergency',
      pregnancyWeekMin: 1,
      pregnancyWeekMax: 40,
      tags: ['emergency', 'warning_signs', 'doctor'],
      language: 'en',
      popularity: 25,
    },
    {
      question: 'What are the signs of labor?',
      answer:
        'Signs include regular contractions that get stronger and closer together, water breaking, bloody show (mucus plug), lower back pain, and pelvic pressure. Early labor contractions are usually 5-20 minutes apart.',
      category: 'labor',
      pregnancyWeekMin: 36,
      pregnancyWeekMax: 42,
      tags: ['labor', 'contractions', 'delivery'],
      language: 'en',
      popularity: 22,
    },
    {
      question: 'How can I manage morning sickness?',
      answer:
        'Eat small, frequent meals, avoid empty stomach, try ginger tea or crackers, stay hydrated, get fresh air, and rest when possible. If severe, consult your doctor about anti-nausea medications.',
      category: 'symptoms',
      pregnancyWeekMin: 4,
      pregnancyWeekMax: 16,
      tags: ['morning_sickness', 'nausea', 'remedies'],
      language: 'en',
      popularity: 30,
    },
  ]

  for (const faq of faqs) {
    await prisma.fAQ.create({ data: faq })
  }

  console.log('✅ Seed completed successfully!')
  console.log(`📝 Created ${healthTips.length} health tips`)
  console.log(`❓ Created ${faqs.length} FAQs`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
