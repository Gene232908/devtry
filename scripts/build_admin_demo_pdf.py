from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "carvibe-admin-dashboard-demo-script.pdf"


NAVY = colors.HexColor("#101725")
INK = colors.HexColor("#172033")
MUTED = colors.HexColor("#5D687A")
GOLD = colors.HexColor("#D4AF37")
PALE_GOLD = colors.HexColor("#FFF6D7")
BLUE = colors.HexColor("#DDEEFF")
RED = colors.HexColor("#FFE1E1")
GREEN = colors.HexColor("#DFF5E7")
LINE = colors.HexColor("#D8DEE8")


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=27, leading=32, textColor=colors.white, alignment=TA_CENTER, spaceAfter=10))
styles.add(ParagraphStyle(name="CoverSub", parent=styles["Normal"], fontName="Helvetica", fontSize=12, leading=18, textColor=colors.HexColor("#E6EDF7"), alignment=TA_CENTER))
styles.add(ParagraphStyle(name="H1x", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=19, leading=23, textColor=NAVY, spaceBefore=4, spaceAfter=8))
styles.add(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=17, textColor=NAVY, spaceBefore=8, spaceAfter=5))
styles.add(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.6, leading=14, textColor=INK, spaceAfter=5))
styles.add(ParagraphStyle(name="Smallx", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.3, leading=11, textColor=MUTED, spaceAfter=3))
styles.add(ParagraphStyle(name="Linex", parent=styles["BodyText"], fontName="Helvetica", fontSize=10, leading=15, textColor=INK, leftIndent=4, rightIndent=4, spaceAfter=2))
styles.add(ParagraphStyle(name="Footerx", parent=styles["Normal"], fontName="Helvetica", fontSize=8, textColor=MUTED, alignment=TA_CENTER))


def p(text, style="Bodyx"):
    return Paragraph(text, styles[style])


def box(label, text, fill, border):
    content = [p(f"<b>{label}</b>", "Smallx"), p(text, "Linex")]
    table = Table([[content]], colWidths=[174 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), fill),
        ("BOX", (0, 0), (-1, -1), 0.7, border),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def speak(text):
    return box("SAY THIS - natural speaking line", text, PALE_GOLD, GOLD)


def click(text):
    return box("SHOW / CLICK", text, BLUE, colors.HexColor("#77A9D8"))


def bash(text):
    return box("LIKELY BASH / QUESTION", text, RED, colors.HexColor("#D47777"))


def answer(text):
    return box("ANSWER / PROOF", text, GREEN, colors.HexColor("#73B58A"))


def section(title, purpose, lines, show, question, proof):
    story = [p(title, "H1x"), p(f"<b>Purpose:</b> {purpose}", "Bodyx"), speak(lines), Spacer(1, 5), click(show), Spacer(1, 5), bash(question), Spacer(1, 5), answer(proof), Spacer(1, 12)]
    return story


class DemoDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(filename, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=17 * mm, bottomMargin=16 * mm, title="CarVibe Admin Dashboard Demo Script")
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="normal")
        self.addPageTemplates([PageTemplate(id="main", frames=frame, onPage=self.draw_page)])

    def draw_page(self, canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(GOLD)
        canvas.setLineWidth(1)
        canvas.line(self.leftMargin, A4[1] - 11 * mm, A4[0] - self.rightMargin, A4[1] - 11 * mm)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(self.leftMargin, 8 * mm, "CarVibe Admin Dashboard - Demo Coaching Script")
        canvas.drawRightString(A4[0] - self.rightMargin, 8 * mm, f"Page {doc.page}")
        canvas.restoreState()


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = DemoDoc(str(OUT))
    story = []

    story.append(Spacer(1, 18 * mm))
    cover = Table([[p("CARVIBE", "CoverTitle")], [p("Admin Dashboard Demo Script", "CoverSub")], [p("Natural Taglish delivery + coaching cues + likely questions", "CoverSub")]], colWidths=[174 * mm], rowHeights=[44 * mm, 16 * mm, 18 * mm])
    cover.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("BOX", (0, 0), (-1, -1), 1, GOLD),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(cover)
    story.append(Spacer(1, 12))
    story.append(p("Use this as a guide, not a word-for-word reading. Look at the screen, explain the reason behind the feature, then give one example. The colored boxes tell you what kind of line it is.", "Bodyx"))
    legend = Table([
        [p("GOLD", "Smallx"), p("Your spoken line", "Smallx")],
        [p("BLUE", "Smallx"), p("What to click or show", "Smallx")],
        [p("RED", "Smallx"), p("Where they may challenge you", "Smallx")],
        [p("GREEN", "Smallx"), p("Answer or proof to give", "Smallx")],
    ], colWidths=[28 * mm, 146 * mm])
    legend.setStyle(TableStyle([("BACKGROUND", (0, 0), (0, 0), PALE_GOLD), ("BACKGROUND", (0, 1), (0, 1), BLUE), ("BACKGROUND", (0, 2), (0, 2), RED), ("BACKGROUND", (0, 3), (0, 3), GREEN), ("GRID", (0, 0), (-1, -1), 0.5, LINE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    story.append(legend)
    story.append(Spacer(1, 10))
    story.append(bash("Do not claim that every feature is fully production-ready. If they ask about final legal, retention, or live-data policy, say: 'That is a separate approval item. The current dashboard already has the workflow and safeguards, but the final policy still needs client and legal confirmation.'"))
    story.append(PageBreak())
    story.append(p("Updated demo notes", "H1x"))
    story.extend(section("Leads demo: filters and cleanup", "Show that the Leads page works with realistic records across statuses, makes, and emirates.", "For the presentation, I click Create Demo Leads once. The system creates clearly marked demonstration records on the Leads page only. I can then select New or Pending, choose a specific make, choose a specific emirate, and combine the filters to prove that the results change correctly.", "Create the demo batch, refresh, test status, make, and emirate filters, then clear the filters. After the meeting, click Delete Demo Leads. It removes the demonstration leads and linked test records, then the demo control becomes available again.", "'Why did deletion fail with a foreign-key error?'", "Inventory references Leads, and Commission references Inventory. Cleanup must follow the dependency order: commission entries, statements, inventory, then demo leads. The reset is scoped to demonstration/test records."))
    story.extend(section("Lead detail: Follow-up note and Activity history", "Keep the latest note easy to edit while preserving a permanent record of every important update.", "This Follow-up note box shows the latest working note for this customer. When any assigned CSR, Purchaser, or Super Admin saves it, the system keeps that latest note here and also saves a dated copy in Activity. Activity also shows who made the update and their role. So the note box is for the next action, while Activity is the history of what happened before.", "Use a safe test lead. Type 'Called seller, inspection confirmed for Friday,' then click Save changes. Point to the new Activity line: it shows the note, date and time, and the staff member who saved it. Then change the status to Contacted and save. Point out that the status change is also recorded. If the record has more than five activities, click See full details; the full timeline opens in a popup and scrolls inside it after roughly ten visible entries.", "'Does a new note overwrite the old one completely?'", "The box always shows the latest working note, so the next person knows the current situation. But the previous saved version stays in Activity with its date, time, and staff member. That means we keep the page simple without losing the follow-up trail."))
    story.extend(section("Commission: month, quarter, and formula", "Explain exactly how a sale becomes a commission record.", "The formula is: selling price minus purchase price equals profit, then profit multiplied by 2 percent equals commission. For example, AED 185,000 minus AED 170,000 is AED 15,000 profit, so the commission is AED 300. If profit is negative, commission is zero. The month comes from the actual sold date, and the quarter is automatic: Q1 is January to March, Q2 April to June, Q3 July to September, and Q4 October to December.", "Show a September sale under Q3 and explain that a sale dated October belongs to Q4. Point out Draft, Issued, Paid, carried-forward entries, and the PDF or CSV statement actions.", "'Will the month update automatically, and can there be a delay?'", "Yes. The period is derived from the stored sold date when commission data loads. A late sale may be carried forward if an earlier statement is already issued or paid, but the entry remains traceable. A normal refresh should show the correct period."))
    story.extend(section("Commission reset", "Explain how to clear demo commission data safely before finishing the presentation.", "If the one-click cleanup is unavailable, the SQL reset removes only the approved test sales and their related records. It deletes commission entries and statements first, then inventory, then the linked test leads. This is why deleting a lead directly can show a foreign-key error.", "Run the approved reset query in Supabase SQL Editor, confirm success, then refresh the Leads and Commission pages. The Commission page should no longer show the demo payable amount, and Create Demo Leads should be available again.", "'Will this delete real customer records?'", "The reset must be scoped by the demonstration/test identifiers agreed for this demo. Do not run a broad delete against all leads or all inventory."))

    story.append(PageBreak())

    story.append(p("Before you start", "H1x"))
    story.append(p("Keep the demo calm and controlled. Open the dashboard already logged in if time is short. Have one lead, one inventory car, and one commission month ready to show. Avoid changing real customer data during the presentation.", "Bodyx"))
    story.append(speak("Good day. I will walk you through the admin side of CarVibe. I will start with the overview, then I will follow the actual business flow: a valuation becomes a lead, a deal becomes inventory, and a sold car becomes a commission record. I will also show the support and configuration pages after that."))
    story.append(click("Start at /admin. Point out the left navigation: Dashboard, Leads, Inventory, Commission, Incomplete Forms, Blocked Numbers, Vehicle Catalog, and Settings."))
    story.append(bash("If someone says, 'Can you just click everything quickly?' do not rush. Say: 'I will keep it short, but I want to show the connection between pages because that is where the business value is.'"))
    story.append(answer("The sidebar order follows the real process: leads come in, a deal creates stock, stock is sold, and the result appears in commission. The other pages protect and maintain that flow."))
    story.append(Spacer(1, 8))

    story.extend(section("1. Login and access", "Only authenticated admin users should enter the private dashboard.", "The first screen is the admin login. I enter the authorized account, and after authentication the system takes me into the protected dashboard. The public website and the admin dashboard are separate areas.", "Show /admin/login only if requested. Otherwise mention that the session is authenticated and open the Overview.", "'Is this only hidden by the URL?'", "No. The admin routes and admin API requests are protected by server-side session checks. The browser is not treated as the authority."))
    story.extend(section("2. Overview / Dashboard", "Give management a quick picture of pipeline activity, customer interest, and recent leads.", "This is the first page I use for a quick health check. The top cards show how many leads are in each stage - new, pending, contacted, inspection scheduled, inspected, negotiating, deal, and closed. I can see the overall movement without opening every record.", "Point to the pipeline cards, then the Message Us and Call Now clicks, Incomplete Forms, Visitors today, the two charts, and Recent Leads. Click Refresh once to show that the view can be refreshed.", "'Are these numbers hardcoded?'", "The dashboard is wired to the admin data layer. The current environment may contain test or demo records, so I would label those clearly during a client review. The page also keeps incomplete forms separate from the main lead pipeline so the numbers are not mixed."))
    story.extend(section("3. Leads Directory", "Search, filter, export, and follow up on every valuation request.", "This is the working list of valuation requests. I can search by customer or vehicle, filter by status, and open a customer record for the next action. The point is to make follow-up easy and visible instead of keeping it in messages or memory.", "Show the table, search box, status filter, pagination, and CSV export. Open a sample lead such as Noura Al Hammadi or another clearly marked test record.", "'What happens when there are many leads?'", "The current list has a server-side cap as a safety guard, and browser pagination keeps the view manageable. True server-side pagination is still a follow-up before the lead volume becomes large."))
    story.extend(section("4. Customer Details / Lead Detail", "Turn a lead into a real follow-up action and preserve the history of what happened.", "Inside the customer record, I can see the vehicle details, mileage, option level, location, contact details, seller description, notes, activity, and direct WhatsApp or call actions. Notes are required because every status change should have context.", "Open a lead. Show the Vehicle card, Contact customer buttons, Status and purchase section, Notes, and Activity. Use a safe example: change a test lead to Contacted, add 'Called seller and scheduled follow-up,' then save only if the demo data is safe.", "'What happens when I mark a lead as Deal?'", "At Deal, the system asks for the exact purchase price and purchase date. Saving the deal creates the linked inventory record, so the car does not need to be typed again on another page. Once a car is recorded in Inventory, the deal status is protected from being moved backward accidentally."))
    story.extend(section("5. Inventory", "Track cars the business has bought, their current status, and the money tied up in stock.", "This page represents cars the business owns. A car arrives here from a lead marked as Deal. I can filter by status and purchase month, see the purchase price, and follow the link back to the original customer record.", "Show the current-month filter, status filter, summary cards, and a sample in-stock or reserved car. Then open the sale dialog for a demo car, but do not submit it unless the dataset is specifically for the demo.", "'Can someone add a car directly here?'", "No, by design. Inventory must have a lead and a purchase price behind it. That keeps the money trail connected to the customer record. A sold car also freezes the purchase basis used for commission."))
    story.extend(section("Inventory overview: do not confuse these three cards", "The three cards use the same unsold cars, but each answers a different business question.", "Money in Cars for Sale is the purchase money currently tied up in every car that is still unsold. Average Time in Stock is the average age in days of those same unsold cars, counted from each purchase date until today. Cars Waiting Too Long is only the count of unsold cars that are over 90 days old. So the first is an AED amount, the second is an average number of days, and the third is a warning count of vehicles.", "Point from left to right. Use this simple example: we have two unsold cars bought for AED 100,000 and AED 150,000. Money in Cars for Sale is AED 250,000. If those cars have been in stock for 20 and 40 days, Average Time in Stock is 30 days. If one car reaches 95 days, Cars Waiting Too Long becomes 1. Say: AED 250,000 is money tied up, 30 days is the usual current stock age, and 1 is the car that needs attention now.", "'Are Money in Cars for Sale and Cars Waiting Too Long the same?'", "No. Money in Cars for Sale includes every unsold car, even one bought yesterday. Cars Waiting Too Long includes only unsold cars over 90 days. Average Time in Stock is not money and not a warning count; it is the average age of the current unsold stock. These cards are not limited by the Dashboard date filter because they describe what is in stock right now."))
    story.extend(section("6. Commission", "Turn completed sales into a clear monthly and quarterly payment view.", "When an inventory car is sold for more than its purchase price, the system calculates two percent of the profit. For example, if we buy at AED 170,000 and sell at AED 185,000, the profit is AED 15,000 and the commission is AED 300. If a car is sold at a loss, the commission is zero.", "Show the quarter cards, expand a quarter to show monthly statements, and point out Draft, Issued, and Paid statuses. Show the statement export button if available.", "'Why is there no commission on a loss?'", "The rule is profit-based. A loss should not create a positive commission. The statement total is built from the recorded sale entries, so it can be checked against Inventory."))
    story.extend(section("7. Incomplete Forms", "Recover people who started the valuation form but did not finish.", "This is not yet a real lead. The person may have entered a name or number, but the details are not complete or confirmed yet. So the system gives the record to a Call Centre agent first, not directly to a Purchaser.", "Open one record. First point to the Call Centre assignment, then the contact buttons, notes, status, and activity history. Explain that the CSR calls the person, confirms the name, car details, emirate, and inspection schedule.", "'When does this become a real lead, and who handles it next?'", "Once the CSR has spoken to the customer and completed the missing details, they choose 'Convert to Lead & Schedule Inspection.' At that moment, the system creates one real lead and automatically assigns a Purchaser. The Purchaser only sees it after it is a proper inspection booking."))
    story.append(speak("Simple example: Anna started the form and left after entering her number. The CSR calls Anna, confirms she has a 2022 BMW in Dubai, and agrees on an inspection tomorrow at 10 AM. The CSR fills in those confirmed details and schedules the inspection. Now Anna becomes a real lead, and a Purchaser is assigned for the next step."))
    story.append(click("For the demo, say this while showing the status: 'The form information is only a starting point. Before I convert it, I manually confirm the important details with the customer. This keeps incomplete forms separate from real leads and keeps the Purchaser's list clean.'"))
    story.extend(section("8. Blocked Numbers", "Prevent spam or OTP abuse from repeatedly reaching the business or consuming message capacity.", "This page shows numbers already blocked, the reason, and suspicious numbers that recently triggered automatic limits. Suspicious does not automatically mean blocked, because a real customer can also hit a limit by mistake.", "Show the block reason labels, suspicious numbers, and the confirmation dialog before blocking or unblocking. Do not change a real number during the demo.", "'Does the system automatically block everyone suspicious?'", "No. Automatic guards surface suspicious behavior, while a human confirmation is used for the final block or unblock action. The customer-facing response stays generic so the system does not reveal which security rule was triggered."))
    story.extend(section("9. Vehicle Catalog", "Control the make, model, and trim options shown in the public valuation form.", "This is where the admin maintains the vehicle list. I select a make, expand a model, and add or remove trims. Whatever is managed here becomes the catalog visitors can use in the valuation flow.", "Search for a make or model, select a make, expand a model, and point out the add-model and add-trim controls. Explain the confirmation step before deletes because deletion can cascade.", "'If I add a model here, will customers see it?'", "Yes, the catalog is the shared source for the public valuation dropdowns. The page refreshes the list and the API validates the change before it is saved."))
    story.extend(section("10. Settings", "Maintain the business contact details and notification destination used by the system.", "Here I can update the WhatsApp number, call number, and notification email. These values power the public contact buttons and lead notification behavior. The page also shows the staff accounts that can sign in.", "Show the three settings areas, edit a field only if you have permission and a safe value, then show the Save changes state. Point out that manager accounts can read but only admins can edit.", "'Does clicking Save always mean it was saved?'", "The success message appears only after the server confirms the database update. If validation or the network fails, the form keeps the changes and shows an error instead of pretending the save worked."))

    story.append(PageBreak())
    story.append(p("Closing script", "H1x"))
    story.append(speak("So that is the complete admin workflow. The dashboard gives the overview, Leads handles follow-up, Customer Details keeps the conversation and audit trail, Deal creates Inventory, and a completed sale rolls into Commission. Incomplete Forms, Blocked Numbers, Vehicle Catalog, and Settings support the main process around it."))
    story.append(speak("The main thing I want to highlight is that the pages are connected. The admin does not need to retype the same vehicle in multiple places, and the financial figures can be traced back to the original lead and sale."))
    story.append(bash("If they ask, 'What is still needed before production?' say this: 'The workflow is implemented, but we still need final client approval for policies such as data retention, the final production acceptance test, and any remaining legal or operational requirements. I would not call those approved until they are verified.'"))
    story.append(answer("Strong final point: demonstrate the relationship, not just the design. One lead, one deal, one inventory car, one sale, and one commission statement is the story they should remember."))
    story.append(Spacer(1, 10))
    story.append(p("Quick recovery lines if you forget", "H2x"))
    recovery = [
        [p("If the page is slow", "Smallx"), p("'I will give it one moment - this screen is loading the current server data.'", "Smallx")],
        [p("If a demo row is missing", "Smallx"), p("'That record is not in this dataset, so I will use the next safe sample. The workflow is the same.'", "Smallx")],
        [p("If they ask about a future feature", "Smallx"), p("'That is a good next scope item. The current page is intentionally limited to the workflow shown here.'", "Smallx")],
        [p("If you lose your place", "Smallx"), p("'Let me connect this back to the business flow: lead, deal, inventory, sale, commission.'", "Smallx")],
    ]
    t = Table(recovery, colWidths=[42 * mm, 132 * mm])
    t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, LINE), ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F2F5F9")), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    story.append(t)
    story.append(Spacer(1, 14))
    story.append(p("Tip: speak in short chunks. Explain what the page is for, show one example, then move on. The audience should feel that you understand the workflow, not that you memorized every label.", "Smallx"))
    doc.build(story)


if __name__ == "__main__":
    build()
