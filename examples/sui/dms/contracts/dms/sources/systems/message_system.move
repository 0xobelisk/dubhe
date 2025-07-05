module dms::message_system {
    use std::ascii::String;
    use dms::dms_schema::Schema;
    use dms::dms_errors::invalid_content_length_error;
    use dms::dms_events::message_sent_event;

    public entry fun send(schema: &mut Schema, content: String, ctx: &mut TxContext) {
        invalid_content_length_error(content.length() < 12);
        schema.message().set(content);
        message_sent_event(ctx.sender(), content);
    }
}